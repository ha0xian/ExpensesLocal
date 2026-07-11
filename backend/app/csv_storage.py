"""App CSV parsing, serialization, load, save, import, and export.

Preserves the existing normalized CSV columns and record types from the JS
frontend. Uses Python's csv module rather than manual string parsing.
"""

from __future__ import annotations

import csv
import io
from pathlib import Path

from .config import APP_CSV_PATH
from .schema_defaults import CSV_COLUMNS, create_initial_state


# ---------------------------------------------------------------------------
# Generic CSV parsing (replaces parseGenericCsv)
# ---------------------------------------------------------------------------

def parse_generic_csv(csv_text: str) -> tuple[list[str], list[dict[str, str]]]:
    """Return (headers, rows) from a generic CSV string."""
    reader = csv.reader(io.StringIO(csv_text))
    records = [row for row in reader]
    if not records:
        return [], []
    headers = [h.strip() for h in records[0]]
    rows = [
        dict(zip(headers, record))
        for record in records[1:]
        if any(cell.strip() for cell in record)
    ]
    return headers, rows


# ---------------------------------------------------------------------------
# Helper coercers (mirror JS numberFrom / booleanFrom)
# ---------------------------------------------------------------------------

def _number(value: str) -> float:
    try:
        n = float(value)
        return n if n == n and n not in (float("inf"), float("-inf")) else 0.0
    except (ValueError, TypeError):
        return 0.0


def _boolean(value: str) -> bool:
    return str(value).strip().lower() in ("true", "yes", "1", "y")


# ---------------------------------------------------------------------------
# Parsing app CSV
# ---------------------------------------------------------------------------

def parse_app_csv(csv_text: str) -> dict:
    """Parse an app CSV string into a state dict matching ExpenseState shape."""
    _headers, rows = parse_generic_csv(csv_text)
    state = create_initial_state()
    state["categories"] = []
    state["subcategories"] = []
    state["accounts"] = []
    state["transactions"] = []
    state["automaticTransactions"] = []
    state["monthlySetup"] = []

    for row in rows:
        rt = row.get("record_type", "")

        if rt == "meta":
            state["selectedMonth"] = row.get("month") or state["selectedMonth"]
            state["currency"] = row.get("currency") or state["currency"]
            state["lastAccessedAt"] = row.get("last_accessed_at") or ""
            state["lastAutomationRunAt"] = row.get("last_automation_run_at") or ""

        elif rt == "category":
            state["categories"].append({
                "id": row.get("id", ""),
                "name": row.get("category", ""),
                "group": row.get("group", ""),
                "defaultBudget": _number(row.get("default_budget", "0")),
                "taxBusinessReady": row.get("tax_business_ready") or "No",
                "notes": row.get("notes") or "",
            })

        elif rt == "subcategory":
            state["subcategories"].append({
                "id": row.get("id", ""),
                "category": row.get("category", ""),
                "name": row.get("subcategory", ""),
                "envelopeGroup": row.get("envelope_group") or "",
                "envelopeStyle": row.get("envelope_style") or "Variable",
                "defaultMonthlyTarget": _number(row.get("default_monthly_target", "0")),
                "notes": row.get("notes") or "",
            })

        elif rt == "account":
            state["accounts"].append({
                "id": row.get("id", ""),
                "name": row.get("account", ""),
                "type": row.get("account_type") or "Bank",
                "openingBalance": _number(row.get("opening_balance", "0")),
                "notes": row.get("notes") or "",
            })

        elif rt == "transaction":
            state["transactions"].append({
                "id": row.get("id", ""),
                "date": row.get("date", ""),
                "type": row.get("type") or "Expense",
                "category": row.get("category", ""),
                "subcategory": row.get("subcategory", ""),
                "account": row.get("account", ""),
                "merchantPayee": row.get("merchant_payee") or "",
                "description": row.get("description", ""),
                "amount": _number(row.get("amount", "0")),
                "currency": row.get("currency") or state["currency"],
                "essential": _boolean(row.get("essential", "")),
                "month": row.get("month", ""),
                "reimbursable": _boolean(row.get("reimbursable", "")),
                "notes": row.get("notes") or "",
                "sourceRuleId": row.get("source_rule_id") or "",
            })

        elif rt == "automatic_transaction":
            state["automaticTransactions"].append({
                "id": row.get("id", ""),
                "enabled": True if row.get("enabled") == "" else _boolean(row.get("enabled", "true")),
                "startDate": row.get("start_date", ""),
                "endDate": row.get("end_date") or "",
                "frequency": row.get("frequency") or "Monthly",
                "customInterval": int(_number(row.get("custom_interval", "1"))) or 1,
                "customUnit": row.get("custom_unit") or "Months",
                "type": row.get("type") or "Expense",
                "category": row.get("category", ""),
                "subcategory": row.get("subcategory", ""),
                "account": row.get("account", ""),
                "merchantPayee": row.get("merchant_payee") or "",
                "description": row.get("description", ""),
                "amount": _number(row.get("amount", "0")),
                "currency": row.get("currency") or state["currency"],
                "essential": _boolean(row.get("essential", "")),
                "reimbursable": _boolean(row.get("reimbursable", "")),
                "notes": row.get("notes") or "",
            })

        elif rt == "monthly_setup":
            state["monthlySetup"].append({
                "id": row.get("id", ""),
                "month": row.get("month", ""),
                "category": row.get("category", ""),
                "subcategory": row.get("subcategory", ""),
                "monthlyTarget": _number(row.get("monthly_target", "0")),
                "startingBalance": _number(row.get("starting_balance", "0")),
                "rollover": _boolean(row.get("rollover", "")),
            })

    if not state["categories"] or not state["subcategories"] or not state["accounts"]:
        raise ValueError("This CSV is missing required app records.")

    return state


# ---------------------------------------------------------------------------
# Serializing app CSV
# ---------------------------------------------------------------------------

def _escape_csv(value: str) -> str:
    """CSV-escape a single field value (mirrors JS escapeCsv)."""
    text = str(value)
    if any(ch in text for ch in ('"', ",", "\r", "\n")):
        return '"' + text.replace('"', '""') + '"'
    return text


def _make_row(**values) -> list[str]:
    """Build a CSV row list with exactly len(CSV_COLUMNS) entries.

    All columns default to empty string; only keys in ``values`` are set.
    """
    row = [values.get(col, "") for col in CSV_COLUMNS]
    # Convert booleans to lowercase strings
    for i, val in enumerate(row):
        if isinstance(val, bool):
            row[i] = str(val).lower()
    return row


def serialize_app_csv(state: dict) -> str:
    """Serialize state dict into the normalized multi-record-type app CSV string.

    Every row is guaranteed to have exactly len(CSV_COLUMNS) fields.
    """
    currency = state.get("currency", "USD")
    rows: list[list[str]] = []

    # meta
    rows.append(_make_row(
        record_type="meta",
        id="app",
        last_accessed_at=str(state.get("lastAccessedAt", "")),
        last_automation_run_at=str(state.get("lastAutomationRunAt", "")),
        month=state.get("selectedMonth", ""),
        currency=currency,
    ))

    # categories
    for item in state.get("categories", []):
        rows.append(_make_row(
            record_type="category",
            id=item.get("id", ""),
            category=item.get("name", ""),
            group=item.get("group", ""),
            default_budget=str(item.get("defaultBudget", 0)),
            tax_business_ready=item.get("taxBusinessReady", "No"),
            notes=item.get("notes", ""),
        ))

    # subcategories
    for item in state.get("subcategories", []):
        rows.append(_make_row(
            record_type="subcategory",
            id=item.get("id", ""),
            category=item.get("category", ""),
            subcategory=item.get("name", ""),
            envelope_group=item.get("envelopeGroup", ""),
            envelope_style=item.get("envelopeStyle", "Variable"),
            default_monthly_target=str(item.get("defaultMonthlyTarget", 0)),
            notes=item.get("notes", ""),
        ))

    # accounts
    for item in state.get("accounts", []):
        rows.append(_make_row(
            record_type="account",
            id=item.get("id", ""),
            account=item.get("name", ""),
            account_type=item.get("type", "Bank"),
            opening_balance=str(item.get("openingBalance", 0)),
            notes=item.get("notes", ""),
        ))

    # monthly_setup
    for item in state.get("monthlySetup", []):
        rows.append(_make_row(
            record_type="monthly_setup",
            id=item.get("id", ""),
            month=item.get("month", ""),
            category=item.get("category", ""),
            subcategory=item.get("subcategory", ""),
            monthly_target=str(item.get("monthlyTarget", 0)),
            starting_balance=str(item.get("startingBalance", 0)),
            rollover=item.get("rollover", False),
        ))

    # automatic_transactions
    for item in state.get("automaticTransactions", []):
        rows.append(_make_row(
            record_type="automatic_transaction",
            id=item.get("id", ""),
            enabled=item.get("enabled", True),
            start_date=item.get("startDate", ""),
            end_date=item.get("endDate", ""),
            frequency=item.get("frequency", "Monthly"),
            custom_interval=str(item.get("customInterval", 1)),
            custom_unit=item.get("customUnit", "Months"),
            type=item.get("type", "Expense"),
            category=item.get("category", ""),
            subcategory=item.get("subcategory", ""),
            account=item.get("account", ""),
            merchant_payee=item.get("merchantPayee", ""),
            description=item.get("description", ""),
            amount=str(item.get("amount", 0)),
            currency=item.get("currency", currency),
            essential=item.get("essential", False),
            reimbursable=item.get("reimbursable", False),
            notes=item.get("notes", ""),
        ))

    # transactions
    for item in state.get("transactions", []):
        rows.append(_make_row(
            record_type="transaction",
            id=item.get("id", ""),
            date=item.get("date", ""),
            month=item.get("month", ""),
            type=item.get("type", "Expense"),
            category=item.get("category", ""),
            subcategory=item.get("subcategory", ""),
            account=item.get("account", ""),
            merchant_payee=item.get("merchantPayee", ""),
            description=item.get("description", ""),
            amount=str(item.get("amount", 0)),
            currency=item.get("currency", currency),
            essential=item.get("essential", False),
            reimbursable=item.get("reimbursable", False),
            notes=item.get("notes", ""),
            source_rule_id=item.get("sourceRuleId", ""),
        ))

    header = ",".join(CSV_COLUMNS)
    body_lines = [",".join(_escape_csv(cell) for cell in row) for row in rows]
    return header + "\r\n" + "\r\n".join(body_lines)


# ---------------------------------------------------------------------------
# File-system helpers
# ---------------------------------------------------------------------------

def load_state(path: Path | None = None) -> dict:
    """Read and parse the app CSV from disk."""
    target = path or APP_CSV_PATH
    if not target.exists():
        raise FileNotFoundError(f"Data file not found: {target}")
    csv_text = target.read_text(encoding="utf-8")
    return parse_app_csv(csv_text)


def save_state(state: dict, path: Path | None = None) -> None:
    """Serialize state and write to disk."""
    target = path or APP_CSV_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    csv_text = serialize_app_csv(state)
    target.write_text(csv_text, encoding="utf-8")


def ensure_data_file(path: Path | None = None) -> dict:
    """Return parsed state from disk or initialized defaults, creating if needed."""
    target = path or APP_CSV_PATH
    if not target.exists():
        state = create_initial_state()
        save_state(state, target)
        return state
    return load_state(target)
