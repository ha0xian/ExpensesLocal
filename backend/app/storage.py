"""Select CSV or PostgreSQL persistence based on DATABASE_URL."""

from __future__ import annotations

import os

from .csv_storage import (
    ensure_data_file,
    load_state as load_state_from_csv,
    save_state as save_state_to_csv,
)
from .postgres_storage import load_state_from_database, save_state_to_database
from .schema_defaults import create_initial_state


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "").strip()


def is_database_enabled() -> bool:
    return bool(database_url())


def storage_backend_label() -> str:
    return "PostgreSQL database" if is_database_enabled() else "expense-data.csv"


def ensure_state() -> dict:
    """Return persisted state, initializing the selected backend if needed."""
    url = database_url()
    if not url:
        return ensure_data_file()

    state = load_state_from_database(url)
    if state is not None:
        return state

    state = _initial_database_state()
    save_state_to_database(state, url)
    return state


def save_state(state: dict) -> None:
    """Persist app state to the selected backend."""
    url = database_url()
    if url:
        save_state_to_database(state, url)
        return
    save_state_to_csv(state)


def _initial_database_state() -> dict:
    """Seed Postgres from the existing CSV when available, otherwise defaults."""
    try:
        return load_state_from_csv()
    except FileNotFoundError:
        return create_initial_state()
