-- schema.sql
-- Full current database schema for HemaLink (read-only reference).
-- This file is NOT executed by the application. Migrations in ../migrations/
-- are the source of truth. This file reflects the state after all migrations
-- through v2_data_layer have been applied.
--
-- Last updated: v2_data_layer
-- -------------------------------------------------------------------------


-- -------------------------------------------------------------------------
-- Migration tracking
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);


-- -------------------------------------------------------------------------
-- Users
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "user" (
    id            SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(100) UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);


-- -------------------------------------------------------------------------
-- Blood test runs
-- Each row represents one file upload + OCR + ML prediction run.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blood_test (
    id              SERIAL PRIMARY KEY,
    clerk_user_id   VARCHAR(100),
    CONSTRAINT clerk_user_fk FOREIGN KEY (clerk_user_id) REFERENCES "user"(clerk_user_id),
    blood_markers   JSON,          -- raw OCR-extracted biomarker values
    disease_results JSON,          -- ML prediction dicts {label, confidence} per disease
    test_time       TIMESTAMPTZ DEFAULT now(),  -- upload timestamp
    s3_original_key TEXT,          -- S3 path to original uploaded file
    s3_ocr_key      TEXT,          -- S3 path to extracted OCR text
    report_date     DATE           -- date printed on the blood test report (user-supplied)
);


-- -------------------------------------------------------------------------
-- Normalized biomarker time-series
-- One row per numeric biomarker value per run. Used for trend charts.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS biomarker_measurements (
    id             SERIAL PRIMARY KEY,
    run_id         INTEGER NOT NULL,
    clerk_user_id  VARCHAR(100) NOT NULL,
    biomarker_code TEXT NOT NULL,
    value          NUMERIC,
    unit           TEXT,
    measured_at    DATE DEFAULT CURRENT_DATE,
    reference_low  NUMERIC,
    reference_high NUMERIC,
    CONSTRAINT bm_run_fk  FOREIGN KEY (run_id)        REFERENCES blood_test(id),
    CONSTRAINT bm_user_fk FOREIGN KEY (clerk_user_id) REFERENCES "user"(clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_bm_user_code
    ON biomarker_measurements (clerk_user_id, biomarker_code, measured_at);


-- -------------------------------------------------------------------------
-- Disease predictions
-- One row per disease per run with a numeric confidence score.
-- Supplements the JSON stored in blood_test.disease_results for querying.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS disease_predictions (
    id           SERIAL PRIMARY KEY,
    run_id       INTEGER NOT NULL,
    disease_name TEXT NOT NULL,
    label        TEXT NOT NULL,   -- "Positive" | "Negative" | "Not enough information" | etc.
    confidence   NUMERIC,         -- 0-100, NULL when prediction could not be made
    CONSTRAINT dp_run_fk FOREIGN KEY (run_id) REFERENCES blood_test(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dp_run_id ON disease_predictions (run_id);


-- -------------------------------------------------------------------------
-- Biomarker reference ranges
-- Clinical healthy ranges per biomarker, optionally gender-specific.
-- Seeded once; used by the analysis page to flag out-of-range values.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS biomarker_reference_ranges (
    id             SERIAL PRIMARY KEY,
    biomarker_code TEXT NOT NULL,
    display_name   TEXT NOT NULL,
    gender         TEXT,          -- 'M', 'F', or NULL for universal ranges
    unit           TEXT,
    low            NUMERIC,       -- NULL means no lower bound
    high           NUMERIC        -- NULL means no upper bound
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brr_code_gender
    ON biomarker_reference_ranges (biomarker_code, COALESCE(gender, ''));

-- Seeded values: see migrations/v2_data_layer.sql
-- Biomarkers covered: Hemoglobin, RBC, WBC, Hematocrit, MCV, MCH, MCHC,
--   Platelets, Fasting Blood Glucose, HbA1c, Insulin, HOMA-IR, Uric Acid,
--   LDL, HDL, Triglycerides, TSH, T3, Total T4, Creatinine, eGFR,
--   ALT, AST, CRP
