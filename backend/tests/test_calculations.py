"""Verify parity-critical calculations."""

from app.calculations import (
    calculate_account_balances,
    calculate_available_to_assign,
    collect_warnings,
    get_transaction_month,
    summarize_month,
)
from app.schema_defaults import create_initial_state


def test_get_transaction_month_valid():
    assert get_transaction_month("2026-06-15") == "2026-06"
    assert get_transaction_month("2026-01-01") == "2026-01"
    assert get_transaction_month("2026-12-31") == "2026-12"


def test_get_transaction_month_invalid():
    assert get_transaction_month("") == ""
    assert get_transaction_month("not-a-date") == ""
    assert get_transaction_month("2026-13-01") == ""
    assert get_transaction_month("2026-02-30") == ""


def test_account_balances_bank_cash_semantics(populated_state):
    balances = calculate_account_balances(populated_state)
    checking = next(b for b in balances if b["account"] == "Checking")
    credit = next(b for b in balances if b["account"] == "Credit Card")

    # Checking: openingBalance(0) + income(5000) - expenses(1500) = 3500
    assert checking["currentBalance"] == 3500.0

    # Credit Card: openingBalance(0) - expenses(120.50) + income(0) = -120.50
    assert credit["currentBalance"] == -120.50


def test_available_to_assign(populated_state):
    # income = 5000, funding = sum of monthly setup for 2026-06
    funding = sum(
        ms["monthlyTarget"]
        for ms in populated_state["monthlySetup"]
        if ms["month"] == "2026-06"
    )
    # Default state: all monthlyTargets are 0
    assert calculate_available_to_assign(populated_state, "2026-06") == 5000.0 - funding


def test_warnings_invalid_date_and_amount():
    state = create_initial_state()
    state["selectedMonth"] = "2026-06"
    state["transactions"] = [
        {
            "id": "bad-date", "date": "invalid", "type": "Expense",
            "category": "Housing", "subcategory": "Rent", "account": "Checking",
            "merchantPayee": "", "description": "", "amount": 100, "currency": "USD",
            "essential": False, "month": "", "reimbursable": False, "notes": "",
            "sourceRuleId": "",
        },
        {
            "id": "bad-amount", "date": "2026-06-01", "type": "Expense",
            "category": "Housing", "subcategory": "Rent", "account": "Checking",
            "merchantPayee": "", "description": "", "amount": -50, "currency": "USD",
            "essential": False, "month": "2026-06", "reimbursable": False, "notes": "",
            "sourceRuleId": "",
        },
        {
            "id": "missing-ref", "date": "2026-06-02", "type": "Expense",
            "category": "Nonexistent", "subcategory": "Ghost", "account": "FakeBank",
            "merchantPayee": "", "description": "", "amount": 100, "currency": "USD",
            "essential": False, "month": "2026-06", "reimbursable": False, "notes": "",
            "sourceRuleId": "",
        },
    ]
    warnings = collect_warnings(state, "2026-06")

    codes = {w["code"] for w in warnings}
    assert "INVALID_DATE" in codes
    assert "INVALID_AMOUNT" in codes
    assert "MISSING_CATEGORY" in codes
    assert "MISSING_SUBCATEGORY" in codes
    assert "MISSING_ACCOUNT" in codes


def test_summarize_month(populated_state):
    summary = summarize_month(populated_state, "2026-06")
    assert summary["income"] == 5000.0
    assert summary["expenses"] == 1620.50
    assert summary["netCashflow"] == 5000.0 - 1620.50
    assert summary["transactionCount"] == 3
    assert summary["essentialSpend"] == 1620.50
