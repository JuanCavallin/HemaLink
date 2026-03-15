-- v1_initial_schema.sql
-- Baseline schema as deployed before v2 changes.
-- Uses CREATE TABLE IF NOT EXISTS so it is safe to apply against an already-initialized database.

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blood_test (
    id SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(100),
    CONSTRAINT clerk_user_fk FOREIGN KEY (clerk_user_id) REFERENCES "user"(clerk_user_id),
    blood_markers JSON,
    disease_results JSON,
    test_time TIMESTAMPTZ DEFAULT now(),
    s3_original_key TEXT,
    s3_ocr_key TEXT,
    report_date DATE
);

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
