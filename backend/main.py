from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import cv2
import numpy as np
import pytesseract
import re
from .patterns import OCR_PATTERNS
from pdf2image import convert_from_bytes

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
async def create_upload_files(files: List[UploadFile] = File(...)):
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
            
        elif file.content_type == "application/pdf":
            print("... PDF detected, converting to image ...")
            try:
                pil_image = convert_from_bytes(contents, first_page=1, last_page=1)[0]
                img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            except Exception as e:
                print(f"PDF processing failed: {e}")
                continue 
        else:
            print(f"Skipping file {file.filename}: Unsupported file type {file.content_type}")
            continue

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        myconfig = r"--psm 4 --oem 3"
        
        text = pytesseract.image_to_string(thresh, config=myconfig)
        
        print(f"--- Extracted Text from {file.filename} ---")
        print(text)
        print("-----------------------------------------")
        
        file_results = {}
        for key, pattern in OCR_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).replace(',', '')
                file_results[key] = value
                print(f"Found: {key} -> {value}")
            else:
                file_results[key] = "Not Found"

        extraction_results[file.filename] = file_results
        
    print("----------------------------------")

    return {
        "message": "Files processed successfully!",
        "results": extraction_results
    }

if __name__ == "__main__":
    # to run front end terminal: uvicorn backend.main:app --reload --port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)