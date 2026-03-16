from fastapi import FastAPI, File, UploadFile, Form, Depends, Query, HTTPException
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
from datetime import date as date_type
from contextlib import asynccontextmanager

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

@asynccontextmanager
async def lifespan(app):
    db_helpers.init_schema(engine)
    ml_utils.load_models_from_s3(s3, S3_BUCKET)
    yield

app = FastAPI(lifespan=lifespan)

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
    test_date: str = Form(""),
    clerk_user_id: str = Depends(get_current_user),
):
    """
    Receives image/PDF files, runs OCR + ML predictions, persists results
    to PostgreSQL (RDS) and raw artifacts to S3.
    """
    logging.info("--- Files Received by Python (user: %s) ---", clerk_user_id)

    # Parse optional test date (ISO format YYYY-MM-DD sent by frontend)
    report_date = None
    if test_date:
        try:
            report_date = date_type.fromisoformat(test_date)
        except ValueError:
            logging.warning("Invalid test_date received: %s — ignoring", test_date)

    # Ensure the user row exists
    db_helpers.upsert_user(engine, clerk_user_id)

    extraction_results = {}
    run_id = None

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
                report_date=report_date,
            )
            db_helpers.insert_biomarkers(engine, run_id, clerk_user_id, file_results,
                                         measured_at=report_date)
            db_helpers.insert_disease_predictions(engine, run_id, predictions)
            logging.info("Saved run %d to PostgreSQL", run_id)
        except Exception as e:
            logging.error("DB write failed: %s", e)

        extraction_results[file.filename] = {
            "raw_ocr_results": file_results,
            "predictions": predictions,
        }

    logging.info("----------------------------------")
    return {
        "message": "Files processed successfully",
        "results": extraction_results,
        "run_id": run_id,
    }


# ---------------------------------------------------------------------------
# Delete record endpoint
# ---------------------------------------------------------------------------

@app.delete("/records/{run_id}")
async def delete_record(
    run_id: int,
    clerk_user_id: str = Depends(get_current_user),
):
    """Delete a blood_test run and all associated data for the authenticated user."""
    deleted = db_helpers.delete_run(engine, clerk_user_id, run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found or access denied")
    return {"message": "Record deleted", "run_id": run_id}


# ---------------------------------------------------------------------------
# Legacy analysis endpoint (keeps existing frontend table working)
# ---------------------------------------------------------------------------

@app.get("/analyzeuserdata")
async def analyze_user_data(clerk_user_id: str = Depends(get_current_user)):
    """Returns latest biomarker values + healthy range status for the Analysis table."""
    latest = db_helpers.get_latest_values(engine, clerk_user_id)

    if not latest:
        return {"message": "No data yet", "values": {}, "graphs": {}}

    gender = db_helpers.get_user_gender(engine, clerk_user_id)
    ref_ranges = db_helpers.get_reference_ranges(engine, gender)

    values = {}
    for code, info in latest.items():
        current = info["value"]
        prev = info["prev"]
        change = None
        if current is not None and prev is not None and prev != 0:
            change = round(((current - prev) / prev) * 100, 1)

        ref = ref_ranges.get(code, {})
        low = ref.get("low")
        high = ref.get("high")
        unit = ref.get("unit", info.get("unit", ""))

        if low is not None and high is not None:
            range_str = f"{low}–{high} {unit}".strip()
        elif low is not None:
            range_str = f">{low} {unit}".strip()
        elif high is not None:
            range_str = f"<{high} {unit}".strip()
        else:
            range_str = ""

        healthy = True
        if current is not None and (low is not None or high is not None):
            if low is not None and current < low:
                healthy = False
            if high is not None and current > high:
                healthy = False

        prev_healthy: bool | None = None
        if prev is not None and (low is not None or high is not None):
            prev_healthy = True
            if low is not None and prev < low:
                prev_healthy = False
            if high is not None and prev > high:
                prev_healthy = False

        values[code] = {
            "value": current,
            "range": range_str,
            "change": change,
            "healthy": healthy,
            "prev_healthy": prev_healthy,
            "low": low,
            "high": high,
        }

    return {"message": "Analysis successful", "values": values, "graphs": {}}


@app.get("/reference-ranges")
async def reference_ranges_endpoint(
    sex: str = Query("", description="'M' or 'F'"),
    _auth: str = Depends(get_current_user),
):
    """Returns all clinical reference ranges, gender-specific rows take precedence when sex is provided."""
    return db_helpers.get_reference_ranges(engine, sex or None)


# ---------------------------------------------------------------------------
# Analysis endpoints
# ---------------------------------------------------------------------------

@app.get("/analysis/disease-history")
async def disease_history_endpoint(clerk_user_id: str = Depends(get_current_user)):
    """Returns per-disease prediction timeseries for the authenticated user."""
    return db_helpers.get_disease_history(engine, clerk_user_id)


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
