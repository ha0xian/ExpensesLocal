"""Verify core API integration using FastAPI test client."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_get_state_returns_full_snapshot():
    """GET /api/state returns state, derived, automationStatus, config, and dataFileName."""
    response = client.get("/api/state")
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    assert "derived" in data
    assert "automationStatus" in data
    assert "config" in data
    assert "dataFileName" in data

    state = data["state"]
    assert "selectedMonth" in state
    assert "categories" in state
    assert len(state["categories"]) > 0

    derived = data["derived"]
    assert "summary" in derived
    assert "availableToAssign" in derived
    assert "warnings" in derived

    config = data["config"]
    assert "months" in config
    assert "recurrencePresets" in config
    assert "recurrenceUnits" in config


def test_post_transaction_persists_and_returns_derived():
    """POST /api/transactions persists a transaction and returns updated derived data."""
    # First get baseline state
    before = client.get("/api/state").json()
    txn_count_before = len(before["state"]["transactions"])

    payload = {
        "date": "2026-06-15",
        "type": "Expense",
        "category": "Housing",
        "subcategory": "Rent",
        "account": "Checking",
        "amount": 500.0,
        "merchantPayee": "Test Landlord",
        "description": "API test transaction",
        "essential": True,
        "reimbursable": False,
        "notes": "",
        "makeAutomatic": False,
        "endDate": "",
        "frequency": "Monthly",
        "customInterval": 1,
        "customUnit": "Months",
    }
    response = client.post("/api/transactions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["state"]["transactions"]) == txn_count_before + 1

    # The new transaction should be first
    new_txn = data["state"]["transactions"][0]
    assert new_txn["category"] == "Housing"
    assert new_txn["amount"] == 500.0
    assert new_txn["month"] == "2026-06"

    # Derived should reflect the new transaction
    assert "summary" in data["derived"]


def test_csv_import_replaces_state():
    """POST /api/csv/import replaces server state from CSV text."""
    # Build a minimal CSV
    csv_text = (
        "record_type,id,last_accessed_at,last_automation_run_at,date,month,type,category,subcategory,account,merchant_payee,description,amount,currency,essential,reimbursable,notes,enabled,start_date,end_date,frequency,custom_interval,custom_unit,source_rule_id,group,default_budget,tax_business_ready,envelope_group,envelope_style,default_monthly_target,monthly_target,starting_balance,rollover,opening_balance,account_type\r\n"
        "meta,app,,,\"2026-06\",,,,,,,,,USD,,,,,,,,,,,,,,,,,,\r\n"
        "category,cat-test,,,,,,TestCat,,,,,,,,,,,,,,,,,,,Test,0,No,,,,,,,\r\n"
        "subcategory,sub-test,,,,,,TestCat,TestSub,,,,,,,,,,,,,,,,,,,,,Variable,0,,,,,\r\n"
        "account,acct-test,,,,,,,,TestAcct,,,,,,,,,,,,,,,,,,,,,,,,0,Bank\r\n"
    )
    response = client.post("/api/csv/import", json={"csvText": csv_text})
    assert response.status_code == 200
    data = response.json()
    assert len(data["state"]["categories"]) == 1
    assert data["state"]["categories"][0]["name"] == "TestCat"
    assert data["state"]["accounts"][0]["name"] == "TestAcct"


def test_export_csv():
    response = client.get("/api/csv/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "record_type" in response.text


def test_config_endpoint():
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert "config" in data
    assert "recurrencePresets" in data["config"]


def test_update_month():
    response = client.put("/api/state/month", json={"month": "2026-03"})
    assert response.status_code == 200
    data = response.json()
    assert data["state"]["selectedMonth"] == "2026-03"
