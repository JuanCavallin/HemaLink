-- v2_data_layer.sql
-- Adds disease_predictions table (structured ML scores per run) and
-- biomarker_reference_ranges table (clinical healthy ranges).

-- -------------------------------------------------------------------------
-- Disease predictions: one row per disease per blood_test run
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS disease_predictions (
    id           SERIAL PRIMARY KEY,
    run_id       INTEGER NOT NULL,
    disease_name TEXT NOT NULL,
    label        TEXT NOT NULL,      -- "Positive", "Negative", "Not enough information", etc.
    confidence   NUMERIC,            -- NULL when prediction could not be made
    CONSTRAINT dp_run_fk FOREIGN KEY (run_id) REFERENCES blood_test(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dp_run_id ON disease_predictions (run_id);

-- -------------------------------------------------------------------------
-- Biomarker reference ranges: clinical healthy ranges per biomarker
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS biomarker_reference_ranges (
    id             SERIAL PRIMARY KEY,
    biomarker_code TEXT NOT NULL,
    display_name   TEXT NOT NULL,
    gender         TEXT,             -- 'M', 'F', or NULL for universal
    unit           TEXT,
    low            NUMERIC,          -- NULL means no lower bound
    high           NUMERIC           -- NULL means no upper bound
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brr_code_gender
    ON biomarker_reference_ranges (biomarker_code, COALESCE(gender, ''));

-- -------------------------------------------------------------------------
-- Seed clinical reference ranges (idempotent via ON CONFLICT DO NOTHING)
-- -------------------------------------------------------------------------

INSERT INTO biomarker_reference_ranges (biomarker_code, display_name, gender, unit, low, high) VALUES
    -- Complete Blood Count
    ('Hemoglobin',             'Hemoglobin',              'M',   'g/dL',              13.5,  17.5),
    ('Hemoglobin',             'Hemoglobin',              'F',   'g/dL',              12.0,  15.5),
    ('RBC',                    'Red Blood Cell Count',    'M',   'M/uL',               4.5,   5.9),
    ('RBC',                    'Red Blood Cell Count',    'F',   'M/uL',               4.0,   5.2),
    ('WBC',                    'White Blood Cell Count',  NULL,  'K/uL',               4.5,  11.0),
    ('Hematocrit',             'Hematocrit',              'M',   '%',                 41.0,  53.0),
    ('Hematocrit',             'Hematocrit',              'F',   '%',                 36.0,  46.0),
    ('MCV',                    'MCV',                     NULL,  'fL',                80.0, 100.0),
    ('MCH',                    'MCH',                     NULL,  'pg',                27.0,  33.0),
    ('MCHC',                   'MCHC',                    NULL,  'g/dL',              32.0,  36.0),
    ('Platelets',              'Platelets',               NULL,  'K/uL',             150.0, 400.0),
    -- Metabolic / Diabetes
    ('Fasting_Blood_Glucose',  'Fasting Blood Glucose',   NULL,  'mg/dL',             70.0,  99.0),
    ('HbA1c',                  'HbA1c',                   NULL,  '%',                 NULL,   5.7),
    ('Insulin_Levels',         'Insulin Levels',          NULL,  'uIU/mL',             2.0,  25.0),
    ('HOMA_IR',                'HOMA-IR',                 NULL,  NULL,                NULL,   2.5),
    ('Uric_Acid_Levels',       'Uric Acid',               'M',   'mg/dL',              3.5,   7.2),
    ('Uric_Acid_Levels',       'Uric Acid',               'F',   'mg/dL',              2.6,   6.0),
    -- Lipid Panel
    ('LDL_Cholesterol',        'LDL Cholesterol',         NULL,  'mg/dL',             NULL, 100.0),
    ('HDL_Cholesterol',        'HDL Cholesterol',         'M',   'mg/dL',             40.0,  NULL),
    ('HDL_Cholesterol',        'HDL Cholesterol',         'F',   'mg/dL',             50.0,  NULL),
    ('Triglyceride_Levels',    'Triglycerides',           NULL,  'mg/dL',             NULL, 150.0),
    -- Thyroid
    ('TSH',                    'TSH',                     NULL,  'mIU/L',              0.4,   4.0),
    ('T3',                     'T3',                      NULL,  'ng/dL',             80.0, 200.0),
    ('TT4',                    'Total T4',                NULL,  'ug/dL',              5.0,  12.0),
    -- Kidney / CKD
    ('Creatinine_Levels',      'Creatinine',              'M',   'mg/dL',              0.7,   1.3),
    ('Creatinine_Levels',      'Creatinine',              'F',   'mg/dL',              0.5,   1.1),
    ('eGFR',                   'eGFR',                    NULL,  'mL/min/1.73m2',     60.0,  NULL),
    -- Liver
    ('ALT',                    'ALT',                     NULL,  'U/L',                7.0,  56.0),
    ('AST',                    'AST',                     NULL,  'U/L',               10.0,  40.0),
    -- Inflammation
    ('CRP_Levels',             'C-Reactive Protein',      NULL,  'mg/L',              NULL,   1.0)
ON CONFLICT DO NOTHING;
