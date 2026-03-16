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

MIGRATIONS = ["v1_initial_schema", "v2_data_layer", "v3_add_label"]

# ---------------------------------------------------------------------------
# Schema initialization (migration runner)
# ---------------------------------------------------------------------------

def init_schema(engine: Engine) -> None:
    """Apply all pending migrations in version order."""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT now()
            )
        """))
        applied = {row[0] for row in conn.execute(text("SELECT version FROM schema_migrations"))}
        for version in MIGRATIONS:
            if version not in applied:
                sql_path = os.path.join(os.path.dirname(__file__), "migrations", f"{version}.sql")
                with open(sql_path, "r") as f:
                    sql = f.read()
                conn.execute(text(sql))
                conn.execute(
                    text("INSERT INTO schema_migrations (version) VALUES (:v)"),
                    {"v": version},
                )
                logger.info("Applied migration: %s", version)
    logger.info("Schema migrations up to date.")


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
    label: str | None = None,
) -> int:
    """Insert a blood_test row and return its id."""
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                INSERT INTO blood_test
                    (clerk_user_id, blood_markers, disease_results,
                     s3_original_key, s3_ocr_key, report_date, label)
                VALUES
                    (:cuid, CAST(:bm AS JSON), CAST(:dr AS JSON), :s3_orig, :s3_ocr, :rdate, :label)
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
                "label": label,
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


def insert_disease_predictions(
    engine: Engine,
    run_id: int,
    predictions: dict[str, dict],
) -> None:
    """
    Insert one disease_predictions row per disease result for a run.

    predictions shape: {"Anemia": {"label": "Positive", "confidence": 92.45}, ...}
    confidence is None when the prediction could not be made.
    """
    rows = [
        {
            "run_id": run_id,
            "disease_name": disease,
            "label": pred.get("label", "Unknown"),
            "confidence": pred.get("confidence"),
        }
        for disease, pred in predictions.items()
    ]
    if not rows:
        return
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO disease_predictions (run_id, disease_name, label, confidence)
                VALUES (:run_id, :disease_name, :label, :confidence)
            """),
            rows,
        )
    logger.info("Inserted %d disease prediction rows for run %d", len(rows), run_id)


def delete_run(engine: Engine, clerk_user_id: str, run_id: int) -> bool:
    """
    Delete a blood_test run and all associated data owned by this user.
    Returns True if a row was deleted, False if not found or not owned by this user.
    """
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM biomarker_measurements WHERE run_id = :rid AND clerk_user_id = :cuid"),
            {"rid": run_id, "cuid": clerk_user_id},
        )
        conn.execute(
            text("DELETE FROM disease_predictions WHERE run_id = :rid"),
            {"rid": run_id},
        )
        result = conn.execute(
            text("DELETE FROM blood_test WHERE id = :rid AND clerk_user_id = :cuid"),
            {"rid": run_id, "cuid": clerk_user_id},
        )
        return result.rowcount > 0


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


def get_disease_history(engine: Engine, clerk_user_id: str) -> dict[str, list[dict]]:
    """
    Returns per-disease prediction timeseries for the user, oldest first.
    Date used: report_date if present, else test_time::date.

    Return shape:
        {"Anemia": [{"date": "YYYY-MM-DD", "label": str, "confidence": float|None}], ...}
    """
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT dp.disease_name,
                       dp.label,
                       dp.confidence,
                       COALESCE(bt.report_date, bt.test_time::date) AS measured_date
                FROM disease_predictions dp
                JOIN blood_test bt ON dp.run_id = bt.id
                WHERE bt.clerk_user_id = :cuid
                ORDER BY dp.disease_name, measured_date ASC
            """),
            {"cuid": clerk_user_id},
        )
        rows = result.fetchall()

    out: dict[str, list[dict]] = {}
    for disease_name, label, confidence, measured_date in rows:
        if disease_name not in out:
            out[disease_name] = []
        out[disease_name].append({
            "date": str(measured_date),
            "label": label,
            "confidence": float(confidence) if confidence is not None else None,
        })
    return out


def get_user_gender(engine: Engine, clerk_user_id: str) -> str | None:
    """Return the most recently recorded sex for the user from blood_test."""
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT blood_markers->>'sex'
                FROM blood_test
                WHERE clerk_user_id = :cuid
                  AND blood_markers->>'sex' IS NOT NULL
                  AND blood_markers->>'sex' NOT IN ('Not Found', '')
                ORDER BY test_time DESC
                LIMIT 1
            """),
            {"cuid": clerk_user_id},
        )
        row = result.fetchone()
    return row[0] if row else None


def get_reference_ranges(engine: Engine, gender: str | None = None) -> dict[str, dict]:
    """
    Return all clinical reference ranges keyed by biomarker_code.
    Gender-specific rows ('M' or 'F') take precedence over universal (NULL gender)
    when a gender is supplied.
    """
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT biomarker_code, display_name, unit, low, high, gender
                FROM biomarker_reference_ranges
                ORDER BY biomarker_code, gender NULLS LAST
            """)
        )
        rows = result.fetchall()

    out: dict[str, dict] = {}
    for code, display_name, unit, low, high, g in rows:
        entry = {
            "display_name": display_name,
            "unit": unit or "",
            "low": float(low) if low is not None else None,
            "high": float(high) if high is not None else None,
        }
        if code not in out:
            out[code] = entry
        elif gender and g == gender:
            # gender-specific row overrides a universal row already stored
            out[code] = entry
    return out


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


SKIP_HISTORY_KEYS = {"age", "sex", "gender", "filename"}


def get_user_history(engine: Engine, clerk_user_id: str) -> list[dict]:
    """
    Return all blood test runs for the user as HistoryItem-compatible dicts,
    newest first. Reconstructs the UploadResponse payload shape expected by
    the frontend summary page.
    """
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT id, test_time, report_date, label, blood_markers, disease_results
                FROM blood_test
                WHERE clerk_user_id = :cuid
                ORDER BY test_time DESC
            """),
            {"cuid": clerk_user_id},
        )
        rows = result.fetchall()

    items = []
    for row in rows:
        run_id, test_time, report_date, label, blood_markers, disease_results = row

        bm = blood_markers if isinstance(blood_markers, dict) else json.loads(blood_markers or "{}")
        dr = disease_results if isinstance(disease_results, dict) else json.loads(disease_results or "{}")

        display_label = label or f"Result {run_id}"

        # Strip metadata keys from raw_ocr_results so the frontend sees only biomarker values
        raw_ocr = {k: v for k, v in bm.items() if k.lower() not in SKIP_HISTORY_KEYS}

        payload = {
            "message": "Loaded from history",
            "run_id": run_id,
            "results": {
                display_label: {
                    "raw_ocr_results": raw_ocr,
                    "predictions": dr,
                }
            },
        }

        items.append({
            "id": str(run_id),
            "createdAt": test_time.isoformat() if test_time else "",
            "label": display_label,
            "age": bm.get("age"),
            "sex": bm.get("sex"),
            "testDate": report_date.isoformat() if report_date else None,
            "runId": run_id,
            "payload": payload,
        })

    return items
