"""Verify recurrence generation and duplicate protection."""

from datetime import date

from app.automatic_transactions import (
    generate_automatic_transactions,
    get_due_dates_for_rule,
    normalize_automatic_transaction_rule,
)
from app.schema_defaults import create_initial_state


def _make_rule(**overrides):
    base = {
        "id": "rule-1",
        "enabled": True,
        "startDate": "2026-01-01",
        "endDate": "",
        "frequency": "Monthly",
        "customInterval": 1,
        "customUnit": "Months",
        "type": "Expense",
        "category": "Housing",
        "subcategory": "Rent",
        "account": "Checking",
        "merchantPayee": "Landlord",
        "description": "Monthly rent",
        "amount": 1500.0,
        "currency": "USD",
        "essential": True,
        "reimbursable": False,
        "notes": "",
    }
    base.update(overrides)
    return base


def test_normalize_sets_defaults():
    rule = normalize_automatic_transaction_rule({"id": "r1", "startDate": "2026-01-01"})
    assert rule["frequency"] == "Monthly"
    assert rule["type"] == "Expense"
    assert rule["currency"] == "USD"
    assert rule["amount"] == 0.0


def test_monthly_rule_generates_due_dates():
    rule = _make_rule(startDate="2026-01-01")
    # Current date June 13, 2026
    due = get_due_dates_for_rule(rule, date(2026, 6, 13))
    # Jan 1, Feb 1, Mar 1, Apr 1, May 1, Jun 1 = 6 occurrences
    assert len(due) == 6
    assert due[0] == "2026-01-01"
    assert due[-1] == "2026-06-01"


def test_custom_every_n_days():
    rule = _make_rule(startDate="2026-06-01", frequency="Custom", customInterval=10, customUnit="Days")
    due = get_due_dates_for_rule(rule, date(2026, 6, 13))
    # Jun 1, Jun 11 = 2 occurrences (Jun 21 is after Jun 13)
    assert len(due) == 2
    assert due == ["2026-06-01", "2026-06-11"]


def test_duplicate_prevention():
    rule = _make_rule(id="dup-rule", startDate="2026-06-01")
    existing = [
        {"sourceRuleId": "dup-rule", "date": "2026-06-01", "id": "auto-dup-rule-2026-06-01"},
    ]
    due = get_due_dates_for_rule(rule, date(2026, 6, 1), existing)
    # Jun 1 already exists, so no due dates
    assert len(due) == 0


def test_disabled_rule_generates_nothing():
    rule = _make_rule(enabled=False, startDate="2026-01-01")
    due = get_due_dates_for_rule(rule, date(2026, 6, 13))
    assert due == []


def test_invalid_rule_generates_nothing_in_full_generation():
    state = create_initial_state()
    state["automaticTransactions"] = [
        _make_rule(id="bad", startDate="", enabled=True),  # invalid: no start date
        _make_rule(id="future", startDate="2026-12-01", enabled=True),  # not due yet
        _make_rule(id="disabled", enabled=False, startDate="2026-01-01"),
    ]
    result = generate_automatic_transactions(state, date(2026, 6, 13))
    assert len(result["generated"]) == 0
    assert len(result["skipped"]) == 2  # bad (no start) + disabled
    assert result["skipped"][0]["ruleId"] == "bad"


def test_generation_prepends_transactions():
    state = create_initial_state()
    state["automaticTransactions"] = [
        _make_rule(id="gen-rule", startDate="2026-06-01"),
    ]
    state["transactions"] = [
        {"id": "existing", "date": "2026-05-01", "type": "Expense",
         "category": "Housing", "subcategory": "Rent", "account": "Checking",
         "merchantPayee": "", "description": "", "amount": 100, "currency": "USD",
         "essential": False, "month": "2026-05", "reimbursable": False, "notes": "",
         "sourceRuleId": ""},
    ]
    result = generate_automatic_transactions(state, date(2026, 6, 13))
    assert len(result["generated"]) == 1
    generated_txn = result["generated"][0]
    assert generated_txn["sourceRuleId"] == "gen-rule"
    assert generated_txn["id"].startswith("auto-gen-rule-")


def test_validate_rejects_impossible_date():
    """Impossible dates like 2026-99-99 are rejected by _validate_automatic_rule."""
    from app.state_service import _validate_automatic_rule
    import pytest
    with pytest.raises(ValueError, match="Start date must be a valid date"):
        _validate_automatic_rule({
            "startDate": "2026-99-99", "frequency": "Monthly", "type": "Expense",
            "category": "Housing", "subcategory": "Rent", "account": "Checking",
            "amount": 100, "customInterval": 1, "customUnit": "Months",
        })
    with pytest.raises(ValueError, match="End date must be a valid date"):
        _validate_automatic_rule({
            "startDate": "2026-06-01", "endDate": "2026-99-99",
            "frequency": "Monthly", "type": "Expense",
            "category": "Housing", "subcategory": "Rent", "account": "Checking",
            "amount": 100, "customInterval": 1, "customUnit": "Months",
        })


def test_update_path_validates_rule():
    """Inline edits that make a rule invalid are rejected."""
    from app.state_service import update_automatic_transaction, create_automatic_transaction
    import pytest

    # Create a valid rule first
    snap = create_automatic_transaction({
        "startDate": "2026-06-01",
        "frequency": "Monthly",
        "type": "Expense",
        "category": "Housing",
        "subcategory": "Rent",
        "account": "Checking",
        "amount": 100.0,
    })
    rule_id = snap["state"]["automaticTransactions"][0]["id"]

    # Setting startDate to an impossible value should raise
    with pytest.raises(ValueError):
        update_automatic_transaction(rule_id, "startDate", "2026-99-99")

    # Setting amount to 0 should raise
    with pytest.raises(ValueError, match="positive amount"):
        update_automatic_transaction(rule_id, "amount", 0)
