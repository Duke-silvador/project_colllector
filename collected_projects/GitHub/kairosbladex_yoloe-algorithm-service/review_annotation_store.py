"""SQLite-backed storage for uncertain review samples and human labels.

The review endpoint may expose a two-state result to existing clients, but the
annotation queue is deliberately fed from the raw review decision.  This
module keeps that queue independent from the response-compatibility layer and
does not require an ORM or a new runtime dependency.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


class AnnotationNotFound(LookupError):
    """Raised when a sample or target does not exist."""


class ReviewAnnotationStore:
    """Small per-process repository for review samples.

    A connection is opened for each operation.  That keeps the store safe for
    FastAPI's worker threads and makes it straightforward to point tests at a
    temporary database.  SQLite WAL mode allows the queue to be read while a
    label update is being committed.
    """

    _SCHEMA = """
    CREATE TABLE IF NOT EXISTS review_annotation_samples (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        original_path TEXT NOT NULL,
        comparison_path TEXT,
        rule_code TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_annotation_targets (
        id TEXT PRIMARY KEY,
        sample_id TEXT NOT NULL REFERENCES review_annotation_samples(id) ON DELETE CASCADE,
        target_index INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        confidence REAL,
        bbox_json TEXT NOT NULL,
        raw_decision TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        yolo_decision TEXT,
        llm_decision TEXT,
        reason_code TEXT,
        error_code TEXT,
        label TEXT CHECK (label IN ('true', 'false') OR label IS NULL),
        note TEXT,
        labeled_at TEXT,
        UNIQUE(sample_id, target_index)
    );

    CREATE INDEX IF NOT EXISTS idx_review_annotation_samples_created
        ON review_annotation_samples(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_review_annotation_targets_sample
        ON review_annotation_targets(sample_id, target_index);
    CREATE INDEX IF NOT EXISTS idx_review_annotation_targets_label
        ON review_annotation_targets(label);
    """

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self._schema_lock = threading.Lock()
        self._schema_ready = False

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(str(self.db_path), timeout=10.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        self._ensure_schema(connection)
        return connection

    @contextmanager
    def _session(self):
        connection = self._connect()
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        if self._schema_ready:
            return
        with self._schema_lock:
            if not self._schema_ready:
                connection.executescript(self._SCHEMA)
                connection.commit()
                self._schema_ready = True

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

    @staticmethod
    def _decode_bbox(raw_bbox: str) -> list[float]:
        try:
            bbox = json.loads(raw_bbox)
            return [float(value) for value in bbox] if isinstance(bbox, list) else []
        except (TypeError, ValueError, json.JSONDecodeError):
            return []

    @staticmethod
    def _counts(connection: sqlite3.Connection, sample_id: str) -> dict[str, int]:
        row = connection.execute(
            """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN label IS NOT NULL THEN 1 ELSE 0 END), 0) AS labeled,
                COALESCE(SUM(CASE WHEN label IS NULL THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN label = 'true' THEN 1 ELSE 0 END), 0) AS true_count,
                COALESCE(SUM(CASE WHEN label = 'false' THEN 1 ELSE 0 END), 0) AS false_count
            FROM review_annotation_targets
            WHERE sample_id = ?
            """,
            (sample_id,),
        ).fetchone()
        return {
            "total": int(row["total"]),
            "labeled": int(row["labeled"]),
            "pending": int(row["pending"]),
            "true": int(row["true_count"]),
            "false": int(row["false_count"]),
        }

    @staticmethod
    def _status(counts: dict[str, int]) -> str:
        if counts["pending"] == 0:
            return "completed"
        if counts["labeled"] == 0:
            return "pending"
        return "in_progress"

    def _sample_summary(self, connection: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
        row_keys = row.keys()
        if "target_total" in row_keys:
            counts = {
                "total": int(row["target_total"] or 0),
                "labeled": int(row["target_labeled"] or 0),
                "pending": int(row["target_pending"] or 0),
                "true": int(row["target_true"] or 0),
                "false": int(row["target_false"] or 0),
            }
        else:
            counts = self._counts(connection, row["id"])
        return {
            "id": row["id"],
            "session_id": row["session_id"],
            "original_path": row["original_path"],
            "comparison_path": row["comparison_path"],
            "rule_code": row["rule_code"],
            "created_at": row["created_at"],
            "status": self._status(counts),
            "counts": counts,
        }

    @classmethod
    def _target(cls, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "target_index": int(row["target_index"]),
            "class_name": row["class_name"],
            "confidence": row["confidence"],
            "bbox": cls._decode_bbox(row["bbox_json"]),
            "raw_decision": row["raw_decision"],
            "reasoning": row["reasoning"],
            "yolo_decision": row["yolo_decision"],
            "llm_decision": row["llm_decision"],
            "reason_code": row["reason_code"],
            "error_code": row["error_code"],
            "label": row["label"],
            "note": row["note"],
            "labeled_at": row["labeled_at"],
        }

    def capture_sample(
        self,
        *,
        session_id: str,
        original_path: str | Path,
        comparison_path: str | Path | None,
        rule_code: str | None,
        targets: Iterable[dict[str, Any]],
    ) -> str | None:
        """Persist one image and all raw uncertain targets found in it.

        Returns ``None`` for an empty target list, so callers can invoke this
        after every review without creating empty queue entries.
        """
        normalized_targets = list(targets)
        if not normalized_targets:
            return None

        sample_id = uuid.uuid4().hex
        created_at = self._now()
        with self._session() as connection:
            connection.execute(
                """
                INSERT INTO review_annotation_samples
                    (id, session_id, original_path, comparison_path, rule_code, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    sample_id,
                    str(session_id),
                    str(original_path),
                    str(comparison_path) if comparison_path else None,
                    rule_code,
                    created_at,
                ),
            )
            for target in normalized_targets:
                bbox = target.get("bbox") or []
                connection.execute(
                    """
                    INSERT INTO review_annotation_targets
                        (id, sample_id, target_index, class_name, confidence, bbox_json,
                         raw_decision, reasoning, yolo_decision, llm_decision,
                         reason_code, error_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        uuid.uuid4().hex,
                        sample_id,
                        int(target.get("target_index", 0)),
                        str(target.get("class_name", "unknown")),
                        target.get("confidence"),
                        json.dumps([float(value) for value in bbox]),
                        str(target.get("raw_decision", "uncertain")),
                        str(target.get("reasoning", "")),
                        target.get("yolo_decision"),
                        target.get("llm_decision"),
                        target.get("reason_code"),
                        target.get("error_code"),
                    ),
                )
        return sample_id

    def list_samples(
        self,
        *,
        status: str = "all",
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        if status not in {"all", "pending", "in_progress", "completed"}:
            raise ValueError("status must be all, pending, in_progress, or completed")
        limit = max(1, min(int(limit), 200))
        offset = max(0, int(offset))

        with self._session() as connection:
            rows = connection.execute(
                """
                SELECT
                    s.*,
                    COUNT(t.id) AS target_total,
                    COALESCE(SUM(CASE WHEN t.label IS NOT NULL THEN 1 ELSE 0 END), 0) AS target_labeled,
                    COALESCE(SUM(CASE WHEN t.label IS NULL THEN 1 ELSE 0 END), 0) AS target_pending,
                    COALESCE(SUM(CASE WHEN t.label = 'true' THEN 1 ELSE 0 END), 0) AS target_true,
                    COALESCE(SUM(CASE WHEN t.label = 'false' THEN 1 ELSE 0 END), 0) AS target_false
                FROM review_annotation_samples AS s
                LEFT JOIN review_annotation_targets AS t ON t.sample_id = s.id
                GROUP BY s.id
                ORDER BY s.created_at DESC, s.id DESC
                """
            ).fetchall()
            summaries = [self._sample_summary(connection, row) for row in rows]
            filtered = [item for item in summaries if status == "all" or item["status"] == status]
            stats = {
                "total_samples": len(summaries),
                "pending_samples": sum(item["status"] == "pending" for item in summaries),
                "in_progress_samples": sum(item["status"] == "in_progress" for item in summaries),
                "completed_samples": sum(item["status"] == "completed" for item in summaries),
                "total_targets": sum(item["counts"]["total"] for item in summaries),
                "pending_targets": sum(item["counts"]["pending"] for item in summaries),
                "labeled_targets": sum(item["counts"]["labeled"] for item in summaries),
                "true_targets": sum(item["counts"]["true"] for item in summaries),
                "false_targets": sum(item["counts"]["false"] for item in summaries),
            }
            return {
                "samples": filtered[offset : offset + limit],
                "pagination": {"limit": limit, "offset": offset, "total": len(filtered)},
                "stats": stats,
            }

    def get_sample(self, sample_id: str) -> dict[str, Any]:
        with self._session() as connection:
            row = connection.execute(
                "SELECT * FROM review_annotation_samples WHERE id = ?",
                (sample_id,),
            ).fetchone()
            if row is None:
                raise AnnotationNotFound(f"sample not found: {sample_id}")
            sample = self._sample_summary(connection, row)
            targets = connection.execute(
                """
                SELECT * FROM review_annotation_targets
                WHERE sample_id = ?
                ORDER BY target_index ASC
                """,
                (sample_id,),
            ).fetchall()
            sample["targets"] = [self._target(target) for target in targets]
            return sample

    def list_confirmed_false_targets(
        self, *, class_name: str | None = None, limit: int = 200
    ) -> list[dict[str, Any]]:
        """Return only human-labelled false targets for offline prompt memory.

        ``label='false'`` is the storage contract; raw model decisions and
        pending annotations are intentionally excluded.
        """
        limit = max(1, min(int(limit), 5000))
        params: list[Any] = ["false"]
        clause = ""
        if class_name and str(class_name).strip():
            clause = " AND lower(t.class_name) = lower(?)"
            params.append(str(class_name).strip())
        params.append(limit)
        with self._session() as connection:
            rows = connection.execute(
                f"""
                SELECT t.*, s.id AS source_sample_id, s.session_id, s.created_at
                FROM review_annotation_targets AS t
                JOIN review_annotation_samples AS s ON s.id = t.sample_id
                WHERE t.label = ?{clause}
                ORDER BY t.labeled_at DESC, t.id DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
            return [
                {
                    **self._target(row),
                    "source_sample_id": row["source_sample_id"],
                    "session_id": row["session_id"],
                    "created_at": row["created_at"],
                    "description": str(row["note"] or row["reasoning"] or "").strip(),
                }
                for row in rows
            ]

    def update_target(
        self,
        sample_id: str,
        target_id: str,
        label: str | None,
        note: str | None,
    ) -> dict[str, Any]:
        if label not in {None, "true", "false"}:
            raise ValueError("label must be true, false, or null")
        with self._session() as connection:
            target = connection.execute(
                """
                SELECT id FROM review_annotation_targets
                WHERE id = ? AND sample_id = ?
                """,
                (target_id, sample_id),
            ).fetchone()
            if target is None:
                raise AnnotationNotFound(f"target not found: {target_id}")
            connection.execute(
                """
                UPDATE review_annotation_targets
                SET label = ?, note = ?, labeled_at = ?
                WHERE id = ? AND sample_id = ?
                """,
                (label, note, self._now() if label else None, target_id, sample_id),
            )
        return self.get_sample(sample_id)
