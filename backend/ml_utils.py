import io
import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict
import re
import logging
import traceback

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Module-level model holders — populated at startup by load_models_from_s3()
ANEMIA_MODEL = None
THYROID_MODEL = None
DIABETES_MODEL = None
CKD_MODEL = None

MODEL_S3_KEYS = {
    "ANEMIA":   "models/anemia_rf_model.pkl",
    "THYROID":  "models/thyroid_rf_model.pkl",
    "DIABETES": "models/diabetes_rf_model.pkl",
    "CKD":      "models/ckd_rf_model.pkl",
}

ANEMIA_FEATURES = ["Gender", "Hemoglobin", "MCH", "MCHC", "MCV"]

THYROID_FEATURES = ["sex", "age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG"]

DIABETES_FEATURES = [
    'Fasting_Blood_Glucose', 'HbA1c', 'Triglyceride_Levels', 'LDL_Cholesterol',
    'HDL_Cholesterol', 'CRP_Levels', 'Insulin_Levels', 'HOMA_IR', 'OGTT',
    'Creatinine_Levels', 'eGFR', 'Uric_Acid_Levels', 'Fructosamine_Levels',
    'ALT', 'AST', 'C_Peptide', 'Proinsulin_Levels'
]

CKD_FEATURES = [
    "Age",
    "Blood Glucose Random (mg/dL)",
    "Blood Urea (mg/dL)",
    "Serum Creatinine (mg/dL)",
    "Sodium (mEq/L)",
    "Potassium (mEq/L)",
    "Hemoglobin (g/dL)",
    "White Blood Cell Count (cells/cumm)",
    "Red Blood Cell Count (millions/cmm)",
    "Target"
]


def load_models_from_s3(s3_client, bucket: str) -> None:
    """
    Download ML model .pkl files from S3 into memory and load with joblib.
    Called once during app lifespan startup. If a model fails to load, it
    remains None and predictions for that model will return "Model not loaded".
    """
    global ANEMIA_MODEL, THYROID_MODEL, DIABETES_MODEL, CKD_MODEL
    setters = {
        "ANEMIA":   lambda m: globals().update(ANEMIA_MODEL=m),
        "THYROID":  lambda m: globals().update(THYROID_MODEL=m),
        "DIABETES": lambda m: globals().update(DIABETES_MODEL=m),
        "CKD":      lambda m: globals().update(CKD_MODEL=m),
    }
    for key, s3_key in MODEL_S3_KEYS.items():
        try:
            response = s3_client.get_object(Bucket=bucket, Key=s3_key)
            model_bytes = response["Body"].read()
            model = joblib.load(io.BytesIO(model_bytes))
            setters[key](model)
            logging.info("Loaded model %s from s3://%s/%s", key, bucket, s3_key)
        except Exception as e:
            logging.error("Failed to load model %s from S3 (s3://%s/%s): %s", key, bucket, s3_key, e)


def get_prediction(model, model_name, features, data_dict) -> dict:
    """
    Prepare a DataFrame and run a prediction.

    Returns a dict with keys:
      - label: str  ("Positive", "Negative", "Not enough information", "Model not loaded", "Prediction Error")
      - confidence: float | None  (0-100, None if prediction could not be made)
      - missing: str | None  (comma-separated missing feature names, only when label is "Not enough information")
    """
    if not model:
        return {"label": "Model not loaded", "confidence": None}

    model_input_data = {}
    missing_features = []

    for model_feature in features:
        # Anemia: Gender field — 0 = male, 1 = female
        if model_feature == "Gender":
            if data_dict.get('sex') == "M":
                model_input_data[model_feature] = 0.0
            else:
                model_input_data[model_feature] = 0.0
            continue

        # Other models: sex field — 1 = male, 0 = female
        if model_feature == "sex":
            sex_value = data_dict.get('sex') or data_dict.get('Gender')
            if not sex_value or sex_value == "Not Found":
                missing_features.append(model_feature)
                model_input_data[model_feature] = "Unknown"
            else:
                sex_val = str(sex_value).upper()
                if sex_val in ['M', 'MALE', '1']:
                    model_input_data[model_feature] = "Male"
                elif sex_val in ['F', 'FEMALE', '0']:
                    model_input_data[model_feature] = "Female"
                else:
                    logging.warning(f"[{model_name}] Unexpected sex value '{sex_value}', defaulting to Female")
                    model_input_data[model_feature] = "Female"
            continue

        if data_dict.get(model_feature) == "Not Found" or model_feature not in data_dict:
            missing_features.append(model_feature)
            model_input_data[model_feature] = np.nan
        else:
            value = data_dict[model_feature]
            try:
                cleaned_value = re.sub(r"[<>]", "", str(value))
                model_input_data[model_feature] = float(cleaned_value)
            except ValueError:
                model_input_data[model_feature] = value

    if missing_features:
        missing_str = ", ".join(missing_features)
        logging.warning(f"[{model_name}] prediction skipped. Missing: {missing_str}")
        return {"label": "Not enough information", "confidence": None, "missing": missing_str}

    try:
        input_df = pd.DataFrame([model_input_data])
        input_df = input_df[features]

        prediction = model.predict(input_df)
        prediction_proba = model.predict_proba(input_df)

        prediction_label = "Positive" if prediction[0] == 1 else "Negative"
        confidence = prediction_proba[0][prediction[0]]

        return {"label": prediction_label, "confidence": float(round(confidence * 100, 2))}

    except Exception as e:
        logging.error(f"[{model_name}] model prediction failed: {e}")
        logging.error(traceback.format_exc())
        return {"label": "Prediction Error", "confidence": None}


def get_all_predictions(file_results: Dict[str, str]) -> Dict[str, dict]:
    """
    Runs all models on the extracted OCR results.
    Returns a dict of {disease_name: {label, confidence, ?missing}}.
    """
    logging.info("Starting Predictions")

    return {
        "Anemia":   get_prediction(ANEMIA_MODEL,   "Anemia",   ANEMIA_FEATURES,   file_results),
        "Thyroid":  get_prediction(THYROID_MODEL,  "Thyroid",  THYROID_FEATURES,  file_results),
        "Diabetes": get_prediction(DIABETES_MODEL, "Diabetes", DIABETES_FEATURES, file_results),
        "CKD":      get_prediction(CKD_MODEL,      "CKD",      CKD_FEATURES,      file_results),
    }
