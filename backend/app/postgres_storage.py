"""PostgreSQL app-state persistence for Supabase-compatible deployments."""

from __future__ import annotations

import json
from typing import Any

STATE_ROW_ID = "default"


def _connect(database_url: str):
    """Create a psycopg connection.

    ``prepare_threshold=None`` keeps the connection friendly to Supabase pooler
    modes that do not support server-side prepared statements.
    """
    import psycopg

    return psycopg.connect(database_url, autocommit=True, prepare_threshold=None)


def _ensure_table(cursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS app_state (
            id text PRIMARY KEY,
            state jsonb NOT NULL,
            updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def _decode_state(value: Any) -> dict | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return dict(value)


def load_state_from_database(database_url: str) -> dict | None:
    """Return the persisted app state, or None when the state row is absent."""
    with _connect(database_url) as conn:
        with conn.cursor() as cursor:
            _ensure_table(cursor)
            cursor.execute(
                "SELECT state FROM app_state WHERE id = %s",
                (STATE_ROW_ID,),
            )
            row = cursor.fetchone()
            return _decode_state(row[0]) if row else None


def save_state_to_database(state: dict, database_url: str) -> None:
    """Persist the complete app state as a single JSONB document."""
    payload = json.dumps(state)
    with _connect(database_url) as conn:
        with conn.cursor() as cursor:
            _ensure_table(cursor)
            cursor.execute(
                """
                INSERT INTO app_state (id, state, updated_at)
                VALUES (%s, %s::jsonb, now())
                ON CONFLICT (id)
                DO UPDATE SET state = EXCLUDED.state, updated_at = now()
                """,
                (STATE_ROW_ID, payload),
            )
