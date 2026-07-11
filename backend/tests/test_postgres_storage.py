"""Verify PostgreSQL-backed app state persistence."""

import json
import sys
from types import SimpleNamespace

from app.schema_defaults import create_initial_state


class FakeCursor:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return self.rows.pop(0) if self.rows else None


class FakeConnection:
    def __init__(self, cursor):
        self.cursor_obj = cursor

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self.cursor_obj


def install_fake_psycopg(monkeypatch, cursor):
    calls = []

    def connect(url, *, autocommit, prepare_threshold):
        calls.append({
            "url": url,
            "autocommit": autocommit,
            "prepare_threshold": prepare_threshold,
        })
        return FakeConnection(cursor)

    monkeypatch.setitem(sys.modules, "psycopg", SimpleNamespace(connect=connect))
    return calls


def test_save_state_to_database_upserts_jsonb(monkeypatch):
    from app.postgres_storage import save_state_to_database

    cursor = FakeCursor()
    calls = install_fake_psycopg(monkeypatch, cursor)
    state = create_initial_state()

    save_state_to_database(state, "postgresql://example")

    assert calls == [{
        "url": "postgresql://example",
        "autocommit": True,
        "prepare_threshold": None,
    }]
    assert any("CREATE TABLE IF NOT EXISTS app_state" in sql for sql, _ in cursor.executed)
    upsert_sql, upsert_params = cursor.executed[-1]
    assert "INSERT INTO app_state" in upsert_sql
    assert upsert_params[0] == "default"
    assert json.loads(upsert_params[1])["selectedMonth"] == state["selectedMonth"]


def test_load_state_from_database_returns_existing_jsonb(monkeypatch):
    from app.postgres_storage import load_state_from_database

    state = create_initial_state()
    state["selectedMonth"] = "2026-09"
    cursor = FakeCursor(rows=[(state,)])
    install_fake_psycopg(monkeypatch, cursor)

    loaded = load_state_from_database("postgresql://example")

    assert loaded["selectedMonth"] == "2026-09"
    assert any("SELECT state FROM app_state" in sql for sql, _ in cursor.executed)


def test_storage_facade_uses_database_url(monkeypatch):
    import app.storage as storage

    saved = []
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setattr(storage, "load_state_from_database", lambda url: {"selectedMonth": "2026-10"})
    monkeypatch.setattr(storage, "save_state_to_database", lambda state, url: saved.append((state, url)))

    assert storage.storage_backend_label() == "PostgreSQL database"
    assert storage.ensure_state()["selectedMonth"] == "2026-10"

    storage.save_state({"selectedMonth": "2026-11"})
    assert saved == [({"selectedMonth": "2026-11"}, "postgresql://example")]
