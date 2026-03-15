"""
db.py — SQLAlchemy Core helper functions for HemaLink.

All read queries filter by clerk_user_id to enforce per-user data isolation.
"""

import json
import logging
import os
from datetime import date
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schema initialization
# ---------------------------------------------------------------------------

def init_schema(engine: Engine) -> None:
    """Run init_db.sql only if the schema does not already exist."""
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user');"
        ))
        already_exists = result.scalar()

    if already_exists:
        logger.info("Schema already exists, skipping initialization.")
        return

    sql_path = os.path.join(os.path.dirname(__file__), "init_db.sql")
    with open(sql_path, "r") as f:
        schema_sql = f.read()
    with engine.begin() as conn:
        conn.execute(text(schema_sql))
    logger.info("Schema initialized successfully.")


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------

def upsert_user(engine: Engine, clerk_user_id: str, email: str = "") -> None:
    """Insert the Clerk user if they don't already exist."""
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO "user" (clerk_user_id, email)
                VALUES (:cuid, :email)
                ON CONFLICT (clerk_user_id) DO NOTHING
                """
            ),
            {"cuid": clerk_user_id, "email": email},
        )


def insert_run(
    engine: Engine,
    clerk_user_id: str,
    blood_markers: dict,
    disease_results: dict,
    s3_original_key: str,
    s3_ocr_key: str,
    report_date: date | None = None,
) -> int:
    """Insert a blood_test row and return its id."""
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                INSERT INTO blood_test
                    (clerk_user_id, blood_markers, disease_results,
                     s3_original_key, s3_ocr_key, report_date)
                VALUES
                    (:cuid, CAST(:bm AS JSON), CAST(:dr AS JSON), :s3_orig, :s3_ocr, :rdate)
                RETURNING id
                """
            ),
            {
                "cuid": clerk_user_id,
                "bm": json.dumps(blood_markers),
                "dr": json.dumps(disease_results),
                "s3_orig": s3_original_key,
                "s3_ocr": s3_ocr_key,
                "rdate": report_date,
            },
        )
        return result.scalar_one()


def insert_biomarkers(
    engine: Engine,
    run_id: int,
    clerk_user_id: str,
    biomarkers: dict[str, Any],
    measured_at: date | None = None,
) -> None:
    """
    Insert one biomarker_measurements row per numeric biomarker value.
    Skips entries that are "Not Found", non-numeric, or metadata fields
    (age, sex, filename, etc.).
    """
    SKIP_KEYS = {"age", "sex", "gender", "filename"}
    rows = []
    for code, raw_value in biomarkers.items():
        if code.lower() in SKIP_KEYS:
            continue
        if raw_value == "Not Found" or raw_value is None:
            continue
        try:
            numeric = float(raw_value)
        except (TypeError, ValueError):
            continue
        rows.append(
            {
                "run_id": run_id,
                "cuid": clerk_user_id,
                "code": code,
                "value": numeric,
                "mat": measured_at or date.today(),
            }
        )

    if not rows:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO biomarker_measurements
                    (run_id, clerk_user_id, biomarker_code, value, measured_at)
                VALUES
                    (:run_id, :cuid, :code, :value, :mat)
                """
            ),
            rows,
        )
    logger.info("Inserted %d biomarker rows for run %s", len(rows), run_id)


# ---------------------------------------------------------------------------
# Read helpers (all filter by clerk_user_id)
# ---------------------------------------------------------------------------

def get_available_biomarkers(engine: Engine, clerk_user_id: str) -> list[str]:
    """Return distinct biomarker codes that have at least one measurement for the user."""
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT DISTINCT biomarker_code
                FROM biomarker_measurements
                WHERE clerk_user_id = :cuid
                ORDER BY biomarker_code
                """
            ),
            {"cuid": clerk_user_id},
        )
        return [row[0] for row in result]


def get_biomarker_history(
    engine: Engine, clerk_user_id: str, biomarker_code: str
) -> list[dict]:
    """
    Return timeseries [{date, value}] for a specific biomarker,
    oldest first, for the authenticated user only.
    """
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT measured_at, value
                FROM biomarker_measurements
                WHERE clerk_user_id = :cuid
                  AND biomarker_code  = :code
                ORDER BY measured_at ASC
                """
            ),
            {"cuid": clerk_user_id, "code": biomarker_code},
        )
        return [
            {"date": str(row[0]), "value": float(row[1])}
            for row in result
        ]


def get_latest_values(engine: Engine, clerk_user_id: str) -> dict[str, dict]:
    """
    For each biomarker, return the latest value and the previous value
    so the Analysis tab can compute deltas.

    Returns:
        {
          "Hemoglobin": {"value": 13.2, "prev": 12.8, "unit": "g/dL"},
          ...
        }
    """
    with engine.connect() as conn:
        # Rank rows per biomarker by date descending; keep ranks 1 and 2
        result = conn.execute(
            text(
                """
                SELECT biomarker_code, value, unit, measured_at, rn
                FROM (
                    SELECT
                        biomarker_code,
                        value,
                        unit,
                        measured_at,
                        ROW_NUMBER() OVER (
                            PARTITION BY biomarker_code
                            ORDER BY measured_at DESC
                        ) AS rn
                    FROM biomarker_measurements
                    WHERE clerk_user_id = :cuid
                ) ranked
                WHERE rn <= 2
                ORDER BY biomarker_code, rn
                """
            ),
            {"cuid": clerk_user_id},
        )
        rows = result.fetchall()

    out: dict[str, dict] = {}
    for row in rows:
        code, val, unit, mdate, rn = row
        if code not in out:
            out[code] = {"value": None, "prev": None, "unit": unit or ""}
        if rn == 1:
            out[code]["value"] = float(val)
        elif rn == 2:
            out[code]["prev"] = float(val)

    return out
