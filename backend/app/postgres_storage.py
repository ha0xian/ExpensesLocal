"""PostgreSQL app-state persistence for Supabase-compatible deployments."""

from __future__ import annotations

import json
from typing import Any

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
        CREATE TABLE IF NOT EXISTS user_app_state (
            user_id text PRIMARY KEY,
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


def load_state_from_database(database_url: str, user_id: str) -> dict | None:
    """Return the persisted app state, or None when the state row is absent."""
    with _connect(database_url) as conn:
        with conn.cursor() as cursor:
            _ensure_table(cursor)
            cursor.execute(
                "SELECT state FROM user_app_state WHERE user_id = %s",
                (user_id,),
            )
            row = cursor.fetchone()
            return _decode_state(row[0]) if row else None


def save_state_to_database(state: dict, database_url: str, user_id: str) -> None:
    """Persist the complete app state as a single JSONB document."""
    payload = json.dumps(state)
    with _connect(database_url) as conn:
        with conn.cursor() as cursor:
            _ensure_table(cursor)
            cursor.execute(
                """
                INSERT INTO user_app_state (user_id, state, updated_at)
                VALUES (%s, %s::jsonb, now())
                ON CONFLICT (user_id)
                DO UPDATE SET state = EXCLUDED.state, updated_at = now()
                """,
                (user_id, payload),
            )
