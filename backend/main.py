from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import cv2
import numpy as np
from pdf2image import convert_from_bytes
import logging

import ocr
import ml_utils

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
    
    logging.info("--- Files Received by Python ---")
    
    extraction_results = {}

    for file in files:
        logging.info(f"Processing File: {file.filename}, Type: {file.content_type}")
        
        contents = await file.read()
        img = None
        
        if file.content_type in ["image/png", "image/jpeg", "image/jpg"]:
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
        elif file.content_type == "application/pdf":
            logging.info("... PDF detected, converting to image ...")
            try:
                pil_image = convert_from_bytes(contents, first_page=1, last_page=1)[0]
                img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            except Exception as e:
                logging.error(f"PDF processing failed: {e}")
                continue 
        else:
            logging.warning(f"Skipping file {file.filename}: Unsupported file type {file.content_type}")
            continue

        file_results = ocr.parse_image_data(img)
        
        if age:
            file_results['age'] = age
            
        if sex:
            file_results['sex'] = sex

        predictions = ml_utils.get_all_predictions(file_results)

        extraction_results[file.filename] = {
            "raw_ocr_results": file_results,
            "predictions": predictions
        }
        
    logging.info("----------------------------------")

    return {
        "message": "Files processed successfully",
        "results": extraction_results
    }

if __name__ == "__main__":
    # to run front end terminal: uvicorn backend.main:app --reload --port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)