"""Shared test fixtures — all tests use a temporary data directory."""

import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

# Ensure backend/app is on sys.path when running from backend/ or backend/tests/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Patch APP_CSV_PATH before any app import so tests never touch the real data file.
_TEMP_DATA_DIR = tempfile.TemporaryDirectory()
_TEMP_CSV_PATH = Path(_TEMP_DATA_DIR.name) / "expense-data.csv"

# Apply the patch at module level so all imports of state_service, csv_storage,
# etc. pick up the temp path.
_patcher = patch("app.config.APP_CSV_PATH", _TEMP_CSV_PATH)
_patcher.start()


def pytest_unconfigure():
    """Clean up temp directory after the test session."""
    _patcher.stop()
    _TEMP_DATA_DIR.cleanup()


# Re-import after patching so modules see the patched path
from app.csv_storage import parse_app_csv, save_state, serialize_app_csv
from app.schema_defaults import create_initial_state


@pytest.fixture
def default_state():
    return create_initial_state()


@pytest.fixture
def populated_state():
    """State with some transactions for testing calculations."""
    state = create_initial_state()
    state["selectedMonth"] = "2026-06"
    state["currency"] = "USD"
    state["transactions"] = [
        {
            "id": "txn-1",
            "date": "2026-06-01",
            "type": "Income",
            "category": "Income",
            "subcategory": "Paycheck",
            "account": "Checking",
            "merchantPayee": "Employer",
            "description": "Salary",
            "amount": 5000.0,
            "currency": "USD",
            "essential": False,
            "month": "2026-06",
            "reimbursable": False,
            "notes": "",
            "sourceRuleId": "",
        },
        {
            "id": "txn-2",
            "date": "2026-06-02",
            "type": "Expense",
            "category": "Housing",
            "subcategory": "Rent",
            "account": "Checking",
            "merchantPayee": "Landlord",
            "description": "June rent",
            "amount": 1500.0,
            "currency": "USD",
            "essential": True,
            "month": "2026-06",
            "reimbursable": False,
            "notes": "",
            "sourceRuleId": "",
        },
        {
            "id": "txn-3",
            "date": "2026-06-05",
            "type": "Expense",
            "category": "Groceries",
            "subcategory": "Food",
            "account": "Credit Card",
            "merchantPayee": "Grocery Store",
            "description": "Weekly groceries",
            "amount": 120.50,
            "currency": "USD",
            "essential": True,
            "month": "2026-06",
            "reimbursable": False,
            "notes": "",
            "sourceRuleId": "",
        },
    ]
    return state
