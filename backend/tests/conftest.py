"""Shared test fixtures."""

import os
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure backend/app is on sys.path when running from backend/ or backend/tests/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.csv_storage import parse_app_csv, save_state, serialize_app_csv
from app.schema_defaults import create_initial_state


@pytest.fixture
def temp_data_dir():
    with tempfile.TemporaryDirectory() as td:
        yield Path(td)


@pytest.fixture
def default_state():
    return create_initial_state()


@pytest.fixture
def populated_state():
    """State with some transactions for testing calculations."""
    state = create_initial_state()
    state["selectedMonth"] = "2026-06"
    state["currency"] = "USD"
    # Add a couple of transactions
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
