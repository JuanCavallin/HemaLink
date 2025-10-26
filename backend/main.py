from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import cv2
import numpy as np
import pytesseract
import re
from .patterns import OCR_PATTERNS
from pdf2image import convert_from_bytes
import pandas as pd
import joblib
import os

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load models
script_dir = os.path.dirname(os.path.abspath(__file__))
model_dir = os.path.join(script_dir, "..", "ML_Models")

def load_model(path):
    try:
        model = joblib.load(path)
        print(f"Successfully loaded model from {path}")
        return model
    except Exception as e:
        print(f"!!! WARNING: Could not load model from {path}. Predictions will be skipped. Error: {e} !!!")
        return None

ANEMIA_MODEL = load_model(os.path.join(model_dir, "anemia_rf_model.pkl"))
THYROID_MODEL = load_model(os.path.join(model_dir, "thyroid_rf_model.pkl"))
DIABETES_MODEL = load_model(os.path.join(model_dir, "diabetes_rf_model.pkl")) 

ANEMIA_FEATURES = ["Gender", "Hemoglobin", "MCH", "MCHC", "MCV"]

THYROID_FEATURES = ["sex", "age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG"]

DIABETES_NUM_FEATURES = [
    'time_in_hospital', 'num_lab_procedures', 'num_procedures', 
    'num_medications', 'number_outpatient', 'number_emergency', 
    'number_inpatient', 'number_diagnoses'
]
# I put old markers here but change for new data
DIABETES_CAT_FEATURES = [
    'gender', 'age', 'max_glu_serum', 'A1Cresult', 'metformin', 'repaglinide', 
    'nateglinide', 'chlorpropamide', 'glimepiride', 'acetohexamide', 'glipizide', 
    'glyburide', 'tolbutamide', 'pioglitazone', 'rosiglitazone', 'acarbose', 
    'miglitol', 'troglitazone', 'tolazamide', 'examide', 'citoglipton', 'insulin', 
    'glyburide-metformin', 'glipizide-metformin', 'glimepiride-pioglitazone', 
    'metformin-rosiglitazone', 'metformin-pioglitazone', 'change', 'diabetesMed'
]
DIABETES_FEATURES = DIABETES_NUM_FEATURES + DIABETES_CAT_FEATURES


def get_prediction(model, model_name, features, data_dict):
    """
    Helper function to prepare a DataFrame and run a prediction.
    """
    if not model:
        return "Model not loaded"
        
    try:
        model_input_data = {}
        for feature in features:
            model_input_data[feature] = np.nan

        for key, value in data_dict.items():
            if key in model_input_data and value != "Not Found":
                try:
                    model_input_data[key] = float(value)
                except ValueError:
                    model_input_data[key] = value
        
        # HACK: map sex from thyroid to gender if its there
        if "sex" in data_dict and data_dict["sex"] != "Not Found":
            sex_val = str(data_dict["sex"]).upper()
            if "Gender" in model_input_data:
                model_input_data["Gender"] = 1.0 if sex_val == "M" else 0.0
            if "gender" in model_input_data:
                model_input_data["gender"] = "Male" if sex_val == "M" else "Female"

        input_df = pd.DataFrame([model_input_data])
        input_df = input_df[features]

        # run prediction
        prediction = model.predict(input_df)
        prediction_proba = model.predict_proba(input_df)
        
        prediction_label = "Positive" if prediction[0] == 1 else "Negative"
        confidence = prediction_proba[0][prediction[0]]
        
        result = f"{prediction_label} (Confidence: {confidence*100:.2f}%)"
        print(f"{model_name} Prediction: {result}")
        return result

    except Exception as e:
        print(f"!!! {model_name} model prediction failed: {e} !!!")
        return f"Prediction Error: {e}"


@app.post("/uploadfiles/")
async def create_upload_files(
    files: List[UploadFile] = File(...),
    age: str = Form(""),
    sex: str = Form("")
):
    """
    Receives image files from the frontend, pre-processes them,
    runs Tesseract OCR, parses the text for lab results,
    and returns the structured data.
    """
    
    print("--- Files Received by Python ---")
    
    extraction_results = {}

    for file in files:
        print(f"Processing File: {file.filename}, Type: {file.content_type}")
        
        contents = await file.read()
        
        if file.content_type in ["image/png", "image/jpeg", "image/jpg"]:
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image_list = [img]
            
        elif file.content_type == "application/pdf":
            print("... PDF detected, converting to image ...")
            try:
                pil_image = convert_from_bytes(contents, first_page=1, last_page=1)[0]
                img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                image_list = [img]
            except Exception as e:
                print(f"PDF processing failed: {e}")
                continue 
        else:
            print(f"Skipping file {file.filename}: Unsupported file type {file.content_type}")
            continue

        all_text = ""
        file_results = {}
        
        for img in image_list:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            myconfig = r"--psm 4 --oem 3"
            text = pytesseract.image_to_string(thresh, config=myconfig)
            all_text += text
            
            print(f"--- Extracted Text from {file.filename} ---")
            print(text)
            print("-----------------------------------------")
            
            for key, pattern in OCR_PATTERNS.items():
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1).replace(',', '')
                    file_results[key] = value
                    print(f"Found: {key} -> {value}")
                else:
                    if key not in file_results:
                        file_results[key] = "Not Found"
        
        if age:
            file_results['age'] = age
            print(f"Using user-provided age: {age}")
            
        if sex:
            file_results['sex'] = sex
            print(f"Using user-provided sex: {sex}")

        # run predictions
        anemia_pred = get_prediction(ANEMIA_MODEL, "Anemia", ANEMIA_FEATURES, file_results)
        thyroid_pred = get_prediction(THYROID_MODEL, "Thyroid", THYROID_FEATURES, file_results)
        diabetes_pred = get_prediction(DIABETES_MODEL, "Diabetes", DIABETES_FEATURES, file_results)

        extraction_results[file.filename] = {
            "raw_ocr_results": file_results,
            "predictions": {
                "Anemia": anemia_pred,
                "Thyroid": thyroid_pred,
                "Diabetes": diabetes_pred
            }
        }
        
    print("----------------------------------")

    return {
        "message": "Files processed successfully",
        "results": extraction_results
    }

if __name__ == "__main__":
    # to run front end terminal: uvicorn backend.main:app --reload --port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)