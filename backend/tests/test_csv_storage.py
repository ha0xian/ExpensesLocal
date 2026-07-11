"""Verify CSV parsing, serialization, and file compatibility."""

import pytest
from app.csv_storage import (
    ensure_data_file,
    load_state,
    parse_app_csv,
    save_state,
    serialize_app_csv,
)
from app.schema_defaults import create_initial_state


def test_default_state_round_trip():
    """Parse serialized default state round trip."""
    state = create_initial_state()
    csv_text = serialize_app_csv(state)
    parsed = parse_app_csv(csv_text)

    assert parsed["selectedMonth"] == state["selectedMonth"]
    assert parsed["currency"] == state["currency"]
    assert len(parsed["categories"]) == len(state["categories"])
    assert len(parsed["subcategories"]) == len(state["subcategories"])
    assert len(parsed["accounts"]) == len(state["accounts"])
    assert len(parsed["monthlySetup"]) == len(state["monthlySetup"])

    # Verify first category
    assert parsed["categories"][0]["id"] == state["categories"][0]["id"]
    assert parsed["categories"][0]["name"] == state["categories"][0]["name"]

    # Verify first account
    assert parsed["accounts"][0]["id"] == state["accounts"][0]["id"]
    assert parsed["accounts"][0]["type"] == state["accounts"][0]["type"]


def test_older_csv_without_automatic_transactions():
    """Load an older CSV missing automatic transaction rows/source markers."""
    csv_text = (
        "record_type,id,last_accessed_at,last_automation_run_at,date,month,type,category,subcategory,account,merchant_payee,description,amount,currency,essential,reimbursable,notes,enabled,start_date,end_date,frequency,custom_interval,custom_unit,source_rule_id,group,default_budget,tax_business_ready,envelope_group,envelope_style,default_monthly_target,monthly_target,starting_balance,rollover,opening_balance,account_type\r\n"
        "meta,app,,,,\"2026-06\",,,,,,,,,USD,,,,,,,,,,,,,,,,,,\r\n"
        "category,cat-housing,,,,,,Housing,,,,,,,,,,,,,,,,,,,Needs,0,No,,,,,,,\r\n"
        "category,cat-income,,,,,,Income,,,,,,,,,,,,,,,,,,,Other,0,No,,,,,,,\r\n"
        "subcategory,sub-rent,,,,,,Housing,Rent,,,,,,,,,,,,,,,,,,,,,Monthly bill,0,,,,,\r\n"
        "subcategory,sub-client,,,,,,Income,Client Payment,,,,,,,,,,,,,,,,,,,,,Temporary,0,,,,,\r\n"
        "account,acct-checking,,,,,,,,,Checking,,,,,,,,,,,,,,,,,,,,,,,0,Bank\r\n"
        "transaction,txn-old,,,,2026-06-01,2026-06,Expense,Housing,Rent,Checking,,Old rent,1500,USD,,,,,,,,,,,,,,,,,,\r\n"
    )
    parsed = parse_app_csv(csv_text)
    assert len(parsed["categories"]) == 2
    assert len(parsed["subcategories"]) == 2
    assert len(parsed["accounts"]) == 1
    assert len(parsed["transactions"]) == 1
    assert parsed["automaticTransactions"] == []
    # The old txn should NOT have sourceRuleId (defaults to "")
    assert parsed["transactions"][0]["sourceRuleId"] == ""


def test_reject_csv_missing_required_records():
    """CSV missing required category/subcategory/account records raises error."""
    # Only a meta row, no categories/subcategories/accounts
    csv_text = (
        "record_type,id,last_accessed_at,last_automation_run_at,date,month,type,category,subcategory,account,merchant_payee,description,amount,currency,essential,reimbursable,notes,enabled,start_date,end_date,frequency,custom_interval,custom_unit,source_rule_id,group,default_budget,tax_business_ready,envelope_group,envelope_style,default_monthly_target,monthly_target,starting_balance,rollover,opening_balance,account_type\r\n"
        "meta,app,,,,\"2026-06\",,,,,,,,,USD,,,,,,,,,,,,,,,,,,\r\n"
    )
    with pytest.raises(ValueError, match="required app records"):
        parse_app_csv(csv_text)


def test_file_save_and_load():
    """Save state to disk and load it back (uses temp path from conftest)."""
    from app.config import APP_CSV_PATH

    state = create_initial_state()
    save_state(state)
    assert APP_CSV_PATH.exists()
    loaded = load_state(APP_CSV_PATH)
    assert loaded["selectedMonth"] == state["selectedMonth"]
    assert len(loaded["categories"]) == len(state["categories"])


def test_ensure_data_file_creates():
    """ensure_data_file returns state when file already exists (created by conftest)."""
    from app.config import APP_CSV_PATH

    # The conftest patch creates the file on first use; delete it to test creation
    if APP_CSV_PATH.exists():
        APP_CSV_PATH.unlink()
    assert not APP_CSV_PATH.exists()
    state = ensure_data_file()
    assert APP_CSV_PATH.exists()
    assert len(state["categories"]) > 0
