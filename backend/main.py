from fastapi import FastAPI, File, UploadFile, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")
import cv2
import numpy as np
from pdf2image import convert_from_bytes
import logging
import uuid

import ocr
import ml_utils
import db as db_helpers
from auth import get_current_user

# AWS / storage
import os
import boto3
import sqlalchemy

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")

engine = sqlalchemy.create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------
S3_BUCKET = os.getenv("S3_BUCKET", "")
s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    db_helpers.init_schema(engine)
    yield

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:3000",
    "https://hemalink.vercel.app",
    "https://hemalink.vercel.app/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

@app.get("/")
def home():
    return {"message": "HemaLink Backend is Running!"}

@app.post("/uploadfiles/")
async def create_upload_files(
    files: List[UploadFile] = File(...),
    age: str = Form(""),
    sex: str = Form(""),
    clerk_user_id: str = Depends(get_current_user),
):
    """
    Receives image/PDF files, runs OCR + ML predictions, persists results
    to PostgreSQL (RDS) and raw artifacts to S3.
    """
    logging.info("--- Files Received by Python (user: %s) ---", clerk_user_id)

    # Ensure the user row exists
    db_helpers.upsert_user(engine, clerk_user_id)

    extraction_results = {}

    for file in files:
        logging.info("Processing File: %s, Type: %s", file.filename, file.content_type)

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
                logging.error("PDF processing failed: %s", e)
                continue
        else:
            logging.warning("Skipping %s: unsupported type %s", file.filename, file.content_type)
            continue

        # OCR + ML
        file_results = ocr.parse_image_data(img)
        if age:
            file_results["age"] = age
        if sex:
            file_results["sex"] = sex

        predictions = ml_utils.get_all_predictions(file_results)

        # ----------------------------------------------------------------
        # Persist to S3
        # ----------------------------------------------------------------
        run_id_str = str(uuid.uuid4())
        s3_original_key = ""
        s3_ocr_key = ""

        if S3_BUCKET:
            try:
                s3_original_key = f"uploads/{clerk_user_id}/{run_id_str}/original_{file.filename}"
                s3.put_object(Bucket=S3_BUCKET, Key=s3_original_key, Body=contents)

                ocr_text = str(file_results)
                s3_ocr_key = f"ocr/{clerk_user_id}/{run_id_str}/ocr.txt"
                s3.put_object(Bucket=S3_BUCKET, Key=s3_ocr_key, Body=ocr_text.encode())
                logging.info("Uploaded artifacts to S3: %s", run_id_str)
            except Exception as e:
                logging.error("S3 upload failed (continuing without S3): %s", e)

        # ----------------------------------------------------------------
        # Persist to PostgreSQL
        # ----------------------------------------------------------------
        try:
            run_id = db_helpers.insert_run(
                engine,
                clerk_user_id=clerk_user_id,
                blood_markers=file_results,
                disease_results=predictions,
                s3_original_key=s3_original_key,
                s3_ocr_key=s3_ocr_key,
            )
            db_helpers.insert_biomarkers(engine, run_id, clerk_user_id, file_results)
            logging.info("Saved run %d to PostgreSQL", run_id)
        except Exception as e:
            logging.error("DB write failed: %s", e)

        extraction_results[file.filename] = {
            "raw_ocr_results": file_results,
            "predictions": predictions,
        }

    logging.info("----------------------------------")
    return {"message": "Files processed successfully", "results": extraction_results}


# ---------------------------------------------------------------------------
# Legacy analysis endpoint (keeps existing frontend table working)
# ---------------------------------------------------------------------------

@app.get("/analyzeuserdata")
async def analyze_user_data(clerk_user_id: str = Depends(get_current_user)):
    """Returns latest biomarker values + delta vs previous run for the Analysis table."""
    latest = db_helpers.get_latest_values(engine, clerk_user_id)

    if not latest:
        return {
            "message": "No data yet",
            "values": {},
            "graphs": {},
        }

    values = {}
    for code, info in latest.items():
        current = info["value"]
        prev = info["prev"]
        change = None
        if current is not None and prev is not None and prev != 0:
            change = round(((current - prev) / prev) * 100, 1)

        values[code] = {
            "value": current,
            "range": "",
            "change": change,
            "healthy": True,
        }

    return {"message": "Analysis successful", "values": values, "graphs": {}}


# ---------------------------------------------------------------------------
# New Analysis endpoints
# ---------------------------------------------------------------------------

@app.get("/analysis/biomarkers")
async def list_biomarkers(clerk_user_id: str = Depends(get_current_user)):
    """List all biomarker codes that have data for the authenticated user."""
    return db_helpers.get_available_biomarkers(engine, clerk_user_id)


@app.get("/analysis/history")
async def biomarker_history(
    biomarker: str = Query(..., description="Biomarker code, e.g. 'Hemoglobin'"),
    clerk_user_id: str = Depends(get_current_user),
):
    """
    Returns a timeseries [{date, value}] for the requested biomarker,
    scoped to the authenticated user only.
    """
    return db_helpers.get_biomarker_history(engine, clerk_user_id, biomarker)


# ---------------------------------------------------------------------------
# Entry point (local dev only)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
