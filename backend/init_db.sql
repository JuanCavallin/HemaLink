-- init_db.sql
-- SQL schema and sample data for HemaLink backend


/*
-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    age INTEGER,
    disease_type VARCHAR(50),
    risk_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (name);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);

-- Sample data
INSERT INTO patients (name, email, age, disease_type, risk_score)
VALUES
  ('Alice Gomez', 'alice@example.com', 34, 'anemia', 0.23),
  ('Bob Smith', 'bob.smith@example.com', 56, 'ckd', 0.71),
  ('Carol Lee', 'carol.lee@example.com', 45, 'diabetes', 0.49)
ON CONFLICT (email) DO NOTHING;

-- Simple test query (uncomment to run)
-- SELECT * FROM patients LIMIT 10;
*/

-- User table: unique clerk_user_id, which maps to blood_test for that user
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Blood tests. Stores blood markers and disease results as JSON
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

ALTER TABLE blood_test
    ADD COLUMN IF NOT EXISTS s3_original_key TEXT,
    ADD COLUMN IF NOT EXISTS s3_ocr_key TEXT,
    ADD COLUMN IF NOT EXISTS report_date DATE;

-- Normalized biomarker rows for efficient trend queries
CREATE TABLE IF NOT EXISTS biomarker_measurements (
    id            SERIAL PRIMARY KEY,
    run_id        INTEGER NOT NULL,
    clerk_user_id VARCHAR(100) NOT NULL,
    biomarker_code TEXT NOT NULL,
    value         NUMERIC,
    unit          TEXT,
    measured_at   DATE DEFAULT CURRENT_DATE,
    reference_low  NUMERIC,
    reference_high NUMERIC,
    CONSTRAINT bm_run_fk  FOREIGN KEY (run_id)        REFERENCES blood_test(id),
    CONSTRAINT bm_user_fk FOREIGN KEY (clerk_user_id) REFERENCES "user"(clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_bm_user_code
    ON biomarker_measurements (clerk_user_id, biomarker_code, measured_at);