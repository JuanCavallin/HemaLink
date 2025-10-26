import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict
import re
import logging
import traceback

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

script_dir = os.path.dirname(os.path.abspath(__file__))
model_dir = os.path.join(script_dir, "ML_Models")

def load_model(path):
    try:
        model = joblib.load(path)
        logging.info(f"Successfully loaded model from {path}")
        return model
    except Exception as e:
        logging.error(f"Could not load model from {path}. Predictions will be skipped. Error: {e}")
        return None

ANEMIA_MODEL = load_model(os.path.join(model_dir, "anemia_rf_model.pkl"))
THYROID_MODEL = load_model(os.path.join(model_dir, "thyroid_rf_model.pkl"))
DIABETES_MODEL = load_model(os.path.join(model_dir, "diabetes_rf_model.pkl")) 

ANEMIA_FEATURES = ["Gender", "Hemoglobin", "MCH", "MCHC", "MCV"]

THYROID_FEATURES = ["sex", "age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG"]

DIABETES_FEATURES = [
    'Fasting_Blood_Glucose', 'HbA1c', 'Triglyceride_Levels', 'LDL_Cholesterol',
    'HDL_Cholesterol', 'CRP_Levels', 'Insulin_Levels', 'HOMA_IR', 'OGTT',
    'Creatinine_Levels', 'eGFR', 'Uric_Acid_Levels', 'Fructosamine_Levels',
    'ALT', 'AST', 'C_Peptide', 'Proinsulin_Levels'
]

def get_prediction(model, model_name, features, data_dict):
    """
    Helper function to prepare a DataFrame and run a prediction.
    """
    if not model:
        return "Model not loaded"

    model_input_data = {} 
    missing_features = []
    
    for model_feature in features:
        # handling for gender and sex fields
        if model_feature == "Gender":
            sex_value = data_dict.get('sex') or data_dict.get('Gender')
            
            if not sex_value or sex_value == "Not Found":
                missing_features.append(model_feature)
                model_input_data[model_feature] = np.nan
            else:
                sex_val = str(sex_value).upper()
                if sex_val in ['M', 'MALE', '1']:
                    model_input_data[model_feature] = 1.0
                elif sex_val in ['F', 'FEMALE', '0']:
                    model_input_data[model_feature] = 0.0
                else:
                    logging.warning(f"[{model_name}] Unexpected sex value '{sex_value}', defaulting to Female (0)")
                    model_input_data[model_feature] = 0.0
            continue
        
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
        return f"Not enough information. Missing: {missing_str}"

    try:
        input_df = pd.DataFrame([model_input_data])
        input_df = input_df[features]
        
        # run prediction
        prediction = model.predict(input_df)
        prediction_proba = model.predict_proba(input_df)
        
        prediction_label = "Positive" if prediction[0] == 1 else "Negative"
        confidence = prediction_proba[0][prediction[0]]
        
        result = f"{prediction_label} (Confidence: {confidence*100:.2f}%)"
        return result

    except Exception as e:
        logging.error(f"[{model_name}] model prediction failed: {e}")
        logging.error(traceback.format_exc())
        return f"Prediction Error: {e}"

def get_all_predictions(file_results: Dict[str, str]) -> Dict[str, str]:
    """
    Runs all models on the extracted OCR results.
    """
    
    logging.info("Starting Predictions")
    
    anemia_pred = get_prediction(
        ANEMIA_MODEL, "Anemia", ANEMIA_FEATURES, file_results
    )
    thyroid_pred = get_prediction(
        THYROID_MODEL, "Thyroid", THYROID_FEATURES, file_results
    )
    diabetes_pred = get_prediction(
        DIABETES_MODEL, "Diabetes", DIABETES_FEATURES, file_results
    )

    return {
        "Anemia": anemia_pred,
        "Thyroid": thyroid_pred,
        "Diabetes": diabetes_pred
    }