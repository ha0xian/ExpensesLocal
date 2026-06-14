"""Centralize load-modify-save operations so routes stay thin.

Every successful mutation saves the CSV and returns a fresh AppSnapshot dict.
Validation failures raise ValueError (→ 400). Missing entities raise LookupError (→ 404).
"""

from __future__ import annotations

import re
import secrets
from datetime import date
from pathlib import Path

from .automatic_transactions import RECURRENCE_PRESETS, RECURRENCE_UNITS
from .calculations import build_derived_state, get_transaction_month
from .config import APP_CSV_PATH
from .csv_storage import (
    ensure_data_file,
    load_state,
    parse_app_csv,
    parse_generic_csv,
    save_state,
    serialize_app_csv,
)
from .schema_defaults import MONTHS_2026, create_initial_state
from .startup_automation import run_startup_automation


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _uid(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4)}"


def _normalize_state(state: dict) -> dict:
    """Ensure all fields have correct types (mirrors JS normalizeState)."""
    currency = state.get("currency", "USD")
    categories = [
        {**c, "defaultBudget": float(c.get("defaultBudget", 0) or 0)}
        for c in state.get("categories", [])
    ]
    subcategories = [
        {**s, "defaultMonthlyTarget": float(s.get("defaultMonthlyTarget", 0) or 0)}
        for s in state.get("subcategories", [])
    ]
    accounts = [
        {**a, "openingBalance": float(a.get("openingBalance", 0) or 0)}
        for a in state.get("accounts", [])
    ]
    transactions = [
        {
            **t,
            "amount": float(t.get("amount", 0) or 0),
            "essential": bool(t.get("essential")),
            "reimbursable": bool(t.get("reimbursable")),
            "month": t.get("month") or get_transaction_month(t.get("date", "")),
        }
        for t in state.get("transactions", [])
    ]
    automatic_transactions = [
        {
            **r,
            "amount": abs(float(r.get("amount", 0) or 0)) or 0.0,
            "enabled": bool(r.get("enabled", True)),
            "essential": bool(r.get("essential")),
            "reimbursable": bool(r.get("reimbursable")),
            "customInterval": int(r.get("customInterval", 1) or 1) or 1,
            "frequency": r.get("frequency") if r.get("frequency") in RECURRENCE_PRESETS else "Monthly",
            "customUnit": r.get("customUnit") if r.get("customUnit") in RECURRENCE_UNITS else "Months",
        }
        for r in state.get("automaticTransactions", [])
    ]
    monthly_setup = [
        {
            **ms,
            "monthlyTarget": float(ms.get("monthlyTarget", 0) or 0),
            "startingBalance": float(ms.get("startingBalance", 0) or 0),
            "rollover": bool(ms.get("rollover")),
        }
        for ms in state.get("monthlySetup", [])
    ]

    return {
        "selectedMonth": state.get("selectedMonth", "2026-01"),
        "currency": currency,
        "lastAccessedAt": state.get("lastAccessedAt", ""),
        "lastAutomationRunAt": state.get("lastAutomationRunAt", ""),
        "categories": categories,
        "subcategories": subcategories,
        "accounts": accounts,
        "transactions": transactions,
        "automaticTransactions": automatic_transactions,
        "monthlySetup": monthly_setup,
    }


def _build_snapshot(state: dict, auto_status: dict | None = None) -> dict:
    """Build an AppSnapshot-shaped dict from raw state."""
    derived = build_derived_state(state)
    if auto_status is None:
        auto_status = {
            "state": None,
            "changed": False,
            "previousAccessDate": state.get("lastAccessedAt", ""),
            "currentAccessDate": state.get("lastAccessedAt", ""),
            "actions": [],
        }
    auto_status.pop("state", None)
    return {
        "state": state,
        "derived": derived,
        "automationStatus": auto_status,
        "config": {
            "months": MONTHS_2026,
            "recurrencePresets": RECURRENCE_PRESETS,
            "recurrenceUnits": RECURRENCE_UNITS,
        },
        "dataFileName": APP_CSV_PATH.name,
    }


def _load_and_automate(run_automation: bool = True) -> tuple[dict, dict]:
    """Load state from disk (init if needed) and optionally run startup automation."""
    state = ensure_data_file()
    state = _normalize_state(state)
    auto_status = {
        "state": None,
        "changed": False,
        "previousAccessDate": state.get("lastAccessedAt", ""),
        "currentAccessDate": state.get("lastAccessedAt", ""),
        "actions": [],
    }
    if run_automation:
        result = run_startup_automation(state)
        if result["changed"]:
            state = _normalize_state(result["state"])
            save_state(state)
        auto_status = result
    return state, auto_status


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _parse_date_strict(value: str) -> date | None:
    """Parse YYYY-MM-DD strictly, returning None for impossible dates like 2026-99-99."""
    if not _DATE_RE.match(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _validate_automatic_rule(rule: dict) -> None:
    """Raise ValueError if the rule fails the same checks as the old JS app."""
    if not rule.get("startDate"):
        raise ValueError("Start date is required.")
    if not rule.get("frequency"):
        raise ValueError("Frequency is required.")
    if not rule.get("type"):
        raise ValueError("Type is required.")
    if not rule.get("category"):
        raise ValueError("Category is required.")
    if not rule.get("subcategory"):
        raise ValueError("Subcategory is required.")
    if not rule.get("account"):
        raise ValueError("Account is required.")
    if not rule.get("amount") or float(rule.get("amount", 0) or 0) <= 0:
        raise ValueError("A positive amount is required.")

    start = _parse_date_strict(rule.get("startDate", ""))
    if not start:
        raise ValueError("Start date must be a valid date (YYYY-MM-DD).")

    end_date = rule.get("endDate", "")
    if end_date:
        end = _parse_date_strict(end_date)
        if not end:
            raise ValueError("End date must be a valid date (YYYY-MM-DD).")
        if end < start:
            raise ValueError("End date cannot be earlier than start date.")

    if rule.get("frequency") == "Custom":
        ci = rule.get("customInterval", 1)
        if not ci or int(ci) <= 0:
            raise ValueError("Custom automatic transactions need a positive interval.")
        if rule.get("customUnit") not in RECURRENCE_UNITS:
            raise ValueError("Custom automatic transactions need a valid unit.")


def _require_exists(collection: list[dict], entity_id: str, label: str) -> None:
    """Raise LookupError if no item in *collection* has the given id."""
    if not any(item.get("id") == entity_id for item in collection):
        raise LookupError(f"{label} not found: {entity_id}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_snapshot(run_automation: bool = True) -> dict:
    state, auto_status = _load_and_automate(run_automation)
    return _build_snapshot(state, auto_status)


def replace_state_from_csv(csv_text: str) -> dict:
    state = parse_app_csv(csv_text)
    state = _normalize_state(state)
    result = run_startup_automation(state)
    state = _normalize_state(result["state"])
    save_state(state)
    return _build_snapshot(state, result)


def export_csv() -> str:
    state = ensure_data_file()
    return serialize_app_csv(_normalize_state(state))


def update_selected_month(month: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    state["selectedMonth"] = month
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Transaction CRUD
# ---------------------------------------------------------------------------

def create_transaction(form: dict) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    amount = abs(float(form.get("amount", 0) or 0))
    currency = state.get("currency", "USD")
    transaction = {
        "id": _uid("txn"),
        "date": form.get("date", ""),
        "type": form.get("type", "Expense"),
        "category": form.get("category", ""),
        "subcategory": form.get("subcategory", ""),
        "account": form.get("account", ""),
        "merchantPayee": form.get("merchantPayee", ""),
        "description": form.get("description", ""),
        "amount": amount,
        "currency": currency,
        "essential": bool(form.get("essential")),
        "month": get_transaction_month(form.get("date", "")),
        "reimbursable": bool(form.get("reimbursable")),
        "notes": form.get("notes", ""),
    }

    if not (transaction["date"] and transaction["type"] and transaction["category"]
            and transaction["subcategory"] and transaction["account"] and amount > 0):
        raise ValueError("Date, type, category, subcategory, account, and a positive amount are required.")

    if form.get("makeAutomatic"):
        rule = {
            "id": _uid("auto-rule"),
            "enabled": True,
            "startDate": form["date"],
            "endDate": form.get("endDate", ""),
            "frequency": form.get("frequency", "Monthly"),
            "customInterval": max(1, int(form.get("customInterval", 1) or 1)),
            "customUnit": form.get("customUnit", "Months"),
            "type": form.get("type", "Expense"),
            "category": form.get("category", ""),
            "subcategory": form.get("subcategory", ""),
            "account": form.get("account", ""),
            "merchantPayee": form.get("merchantPayee", ""),
            "description": form.get("description", ""),
            "amount": amount,
            "currency": currency,
            "essential": bool(form.get("essential")),
            "reimbursable": bool(form.get("reimbursable")),
            "notes": form.get("notes", ""),
        }
        _validate_automatic_rule(rule)
        state["automaticTransactions"] = [rule] + state.get("automaticTransactions", [])

    state["transactions"] = [transaction] + state.get("transactions", [])
    state = _normalize_state(state)
    save_state(state)
    return _build_snapshot(state, auto_status)


def update_transaction(transaction_id: str, field: str, value) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("transactions", []), transaction_id, "Transaction")
    transactions = []
    for t in state.get("transactions", []):
        if t["id"] != transaction_id:
            transactions.append(t)
            continue
        if field == "amount":
            value = abs(float(value or 0))
        t = dict(t)
        t[field] = value
        if field == "date":
            t["month"] = get_transaction_month(str(value))
        if field == "category":
            subcats = [s for s in state.get("subcategories", []) if s["category"] == value]
            t["subcategory"] = subcats[0]["name"] if subcats else ""
        transactions.append(t)
    state["transactions"] = transactions
    state = _normalize_state(state)
    save_state(state)
    return _build_snapshot(state, auto_status)


def delete_transaction(transaction_id: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("transactions", []), transaction_id, "Transaction")
    state["transactions"] = [t for t in state.get("transactions", []) if t["id"] != transaction_id]
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Automatic transaction CRUD
# ---------------------------------------------------------------------------

def create_automatic_transaction(form: dict) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    amount = abs(float(form.get("amount", 0) or 0))
    rule = {
        "id": _uid("auto-rule"),
        "enabled": bool(form.get("enabled", True)),
        "startDate": form.get("startDate", ""),
        "endDate": form.get("endDate", ""),
        "frequency": form.get("frequency", "Monthly"),
        "customInterval": max(1, int(form.get("customInterval", 1) or 1)),
        "customUnit": form.get("customUnit", "Months"),
        "type": form.get("type", "Expense"),
        "category": form.get("category", ""),
        "subcategory": form.get("subcategory", ""),
        "account": form.get("account", ""),
        "merchantPayee": form.get("merchantPayee", ""),
        "description": form.get("description", ""),
        "amount": amount,
        "currency": state.get("currency", "USD"),
        "essential": bool(form.get("essential")),
        "reimbursable": bool(form.get("reimbursable")),
        "notes": form.get("notes", ""),
    }
    _validate_automatic_rule(rule)
    state["automaticTransactions"] = [rule] + state.get("automaticTransactions", [])
    state = _normalize_state(state)
    save_state(state)
    return _build_snapshot(state, auto_status)


def update_automatic_transaction(rule_id: str, field: str, value) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("automaticTransactions", []), rule_id, "Automatic transaction")
    numeric_fields = {"amount", "customInterval"}
    boolean_fields = {"enabled", "essential", "reimbursable"}
    rules = []
    for r in state.get("automaticTransactions", []):
        if r["id"] != rule_id:
            rules.append(r)
            continue
        r = dict(r)
        if field in numeric_fields:
            r[field] = abs(float(value or 0)) or 0
        elif field in boolean_fields:
            r[field] = bool(value)
        else:
            r[field] = value
        if field == "category":
            subcats = [s for s in state.get("subcategories", []) if s["category"] == value]
            r["subcategory"] = subcats[0]["name"] if subcats else ""
        if field == "customInterval":
            r["customInterval"] = max(1, int(r["customInterval"] or 1))
        rules.append(r)
    # Validate the updated rule so inline edits cannot make it invalid
    updated = next((r for r in rules if r["id"] == rule_id), None)
    if updated:
        _validate_automatic_rule(updated)
    state["automaticTransactions"] = rules
    state = _normalize_state(state)
    save_state(state)
    return _build_snapshot(state, auto_status)


def delete_automatic_transaction(rule_id: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("automaticTransactions", []), rule_id, "Automatic transaction")
    state["automaticTransactions"] = [r for r in state.get("automaticTransactions", []) if r["id"] != rule_id]
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Category CRUD
# ---------------------------------------------------------------------------

def create_category(form: dict) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    if not form.get("name"):
        raise ValueError("Category name is required.")
    cat = {
        "id": _uid("cat"),
        "name": form["name"],
        "group": form.get("group", ""),
        "defaultBudget": float(form.get("defaultBudget", 0) or 0),
        "taxBusinessReady": form.get("taxBusinessReady", "No"),
        "notes": form.get("notes", ""),
    }
    state["categories"] = state.get("categories", []) + [cat]
    save_state(state)
    return _build_snapshot(state, auto_status)


def update_category(category_id: str, field: str, value) -> dict:
    return _update_collection("categories", category_id, field, value, "Category")


def delete_category(category_id: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("categories", []), category_id, "Category")
    state["categories"] = [c for c in state.get("categories", []) if c["id"] != category_id]
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Subcategory CRUD
# ---------------------------------------------------------------------------

def create_subcategory(form: dict) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    if not form.get("category") or not form.get("name"):
        raise ValueError("Category and subcategory name are required.")
    sub = {
        "id": _uid("sub"),
        "category": form["category"],
        "name": form["name"],
        "envelopeGroup": form.get("envelopeGroup", ""),
        "envelopeStyle": form.get("envelopeStyle", "Variable"),
        "defaultMonthlyTarget": float(form.get("defaultMonthlyTarget", 0) or 0),
        "notes": form.get("notes", ""),
    }
    state["subcategories"] = state.get("subcategories", []) + [sub]
    save_state(state)
    return _build_snapshot(state, auto_status)


def update_subcategory(subcategory_id: str, field: str, value) -> dict:
    return _update_collection("subcategories", subcategory_id, field, value, "Subcategory")


def delete_subcategory(subcategory_id: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("subcategories", []), subcategory_id, "Subcategory")
    state["subcategories"] = [s for s in state.get("subcategories", []) if s["id"] != subcategory_id]
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Account CRUD
# ---------------------------------------------------------------------------

def create_account(form: dict) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    if not form.get("name"):
        raise ValueError("Account name is required.")
    acct = {
        "id": _uid("acct"),
        "name": form["name"],
        "type": form.get("type", "Bank"),
        "openingBalance": float(form.get("openingBalance", 0) or 0),
        "notes": form.get("notes", ""),
    }
    state["accounts"] = state.get("accounts", []) + [acct]
    save_state(state)
    return _build_snapshot(state, auto_status)


def update_account(account_id: str, field: str, value) -> dict:
    return _update_collection("accounts", account_id, field, value, "Account")


def delete_account(account_id: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("accounts", []), account_id, "Account")
    state["accounts"] = [a for a in state.get("accounts", []) if a["id"] != account_id]
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Monthly setup
# ---------------------------------------------------------------------------

def update_monthly_setup(setup_id: str, field: str, value) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get("monthlySetup", []), setup_id, "Monthly setup")
    numeric_fields = {"monthlyTarget", "startingBalance"}
    items = []
    for ms in state.get("monthlySetup", []):
        if ms["id"] != setup_id:
            items.append(ms)
            continue
        ms = dict(ms)
        if field == "rollover":
            ms[field] = bool(value)
        elif field in numeric_fields:
            ms[field] = float(value or 0) or 0
        else:
            ms[field] = value
        items.append(ms)
    state["monthlySetup"] = items
    save_state(state)
    return _build_snapshot(state, auto_status)


def fill_missing_monthly_setup() -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    month = state.get("selectedMonth", "2026-01")
    existing = {(ms["month"], ms["category"], ms["subcategory"]) for ms in state.get("monthlySetup", [])}
    for sub in state.get("subcategories", []):
        if sub.get("envelopeStyle") == "Temporary":
            continue
        key = (month, sub["category"], sub["name"])
        if key in existing:
            continue
        state["monthlySetup"].append({
            "id": f"setup-{month}-{sub['id']}",
            "month": month,
            "category": sub["category"],
            "subcategory": sub["name"],
            "monthlyTarget": float(sub.get("defaultMonthlyTarget", 0) or 0),
            "startingBalance": 0.0,
            "rollover": sub.get("envelopeStyle") in ("Sinking fund", "Savings goal"),
        })
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Bank import
# ---------------------------------------------------------------------------

def bank_import_preview(csv_text: str, mapping: dict[str, str] | None = None) -> dict:
    from .bank_import import guess_mapping, map_bank_import_rows

    headers, rows = parse_generic_csv(csv_text)
    if mapping is None:
        mapping = guess_mapping(headers)
    state = ensure_data_file()
    preview_rows = map_bank_import_rows(rows[:8], mapping, _normalize_state(state))
    return {
        "headers": headers,
        "rows": rows,
        "mapping": mapping,
        "previewRows": preview_rows,
        "rowCount": len(rows),
    }


def bank_import_apply(rows: list[dict[str, str]], mapping: dict[str, str]) -> dict:
    from .bank_import import map_bank_import_rows

    state, auto_status = _load_and_automate(run_automation=False)
    mapped = map_bank_import_rows(rows, mapping, state)
    state["transactions"] = mapped + state.get("transactions", [])
    state = _normalize_state(state)
    save_state(state)
    return _build_snapshot(state, auto_status)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _update_collection(collection: str, item_id: str, field: str, value, label: str) -> dict:
    state, auto_status = _load_and_automate(run_automation=False)
    _require_exists(state.get(collection, []), item_id, label)
    numeric_fields = {"defaultBudget", "defaultMonthlyTarget", "openingBalance", "monthlyTarget", "startingBalance"}
    items = []
    for item in state.get(collection, []):
        if item["id"] != item_id:
            items.append(item)
            continue
        item = dict(item)
        item[field] = float(value or 0) or 0 if field in numeric_fields else value
        items.append(item)
    state[collection] = items
    save_state(state)
    return _build_snapshot(state, auto_status)
