"""Port of recurrence logic from src/lib/automatic-transactions.js."""

from __future__ import annotations

import re
from datetime import date, timedelta
from calendar import monthrange

from .calculations import get_transaction_month

RECURRENCE_PRESETS = ["Weekly", "Biweekly", "Monthly", "Quarterly", "Yearly", "Custom"]
RECURRENCE_UNITS = ["Days", "Weeks", "Months", "Years"]

PRESET_INTERVALS = {
    "Weekly": {"interval": 1, "unit": "Weeks"},
    "Biweekly": {"interval": 2, "unit": "Weeks"},
    "Monthly": {"interval": 1, "unit": "Months"},
    "Quarterly": {"interval": 3, "unit": "Months"},
    "Yearly": {"interval": 1, "unit": "Years"},
}

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_local_date(value: str) -> date | None:
    if not _DATE_RE.match(str(value or "")):
        return None
    parts = value.split("-")
    y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
    try:
        parsed = date(y, m, d)
    except ValueError:
        return None
    if parsed.year != y or parsed.month != m or parsed.day != d:
        return None
    return parsed


def _format_local_date(d: date) -> str:
    return f"{d.year}-{d.month:02d}-{d.day:02d}"


def _to_local_date(value) -> str:
    if isinstance(value, date):
        return _format_local_date(value)
    if isinstance(value, str):
        parsed = _parse_local_date(value)
        if parsed:
            return _format_local_date(parsed)
    return _format_local_date(date.today())


def _add_days(d: date, days: int) -> date:
    return d + timedelta(days=days)


def _add_months(anchor: date, months: int) -> date:
    year = anchor.year
    month = anchor.month - 1 + months  # 0-based
    day = anchor.day
    new_year = year + month // 12
    new_month = (month % 12) + 1
    last_day = monthrange(new_year, new_month)[1]
    return date(new_year, new_month, min(day, last_day))


def _add_interval(anchor: date, occurrence_index: int, interval: int, unit: str) -> date:
    if unit == "Days":
        return _add_days(anchor, occurrence_index * interval)
    if unit == "Weeks":
        return _add_days(anchor, occurrence_index * interval * 7)
    if unit == "Years":
        return _add_months(anchor, occurrence_index * interval * 12)
    return _add_months(anchor, occurrence_index * interval)


def _interval_for_rule(rule: dict) -> dict:
    if rule.get("frequency") == "Custom":
        interval = max(1, int(rule.get("customInterval", 1) or 1))
        unit = rule.get("customUnit", "Months")
        if unit not in RECURRENCE_UNITS:
            unit = "Months"
        return {"interval": interval, "unit": unit}
    return PRESET_INTERVALS.get(rule.get("frequency", "Monthly"), PRESET_INTERVALS["Monthly"])


def _is_valid_rule(rule: dict) -> bool:
    start = _parse_local_date(rule.get("startDate", ""))
    end_raw = rule.get("endDate", "")
    end = _parse_local_date(end_raw) if end_raw else None
    return bool(
        rule.get("enabled")
        and rule.get("id")
        and start
        and rule.get("type")
        and rule.get("category")
        and rule.get("subcategory")
        and rule.get("account")
        and float(rule.get("amount", 0) or 0) > 0
        and (not end_raw or end is not None)
        and (not end or end >= start)
        and (
            rule.get("frequency") != "Custom"
            or (
                int(rule.get("customInterval", 1) or 1) > 0
                and rule.get("customUnit") in RECURRENCE_UNITS
            )
        )
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def normalize_automatic_transaction_rule(rule: dict | None, fallback_currency: str = "USD") -> dict:
    if rule is None:
        rule = {}
    frequency = rule.get("frequency") if rule.get("frequency") in RECURRENCE_PRESETS else "Monthly"
    custom_unit = rule.get("customUnit") if rule.get("customUnit") in RECURRENCE_UNITS else "Months"
    custom_interval = abs(int(rule.get("customInterval", 1) or 1)) or 1

    return {
        "id": rule.get("id") or "",
        "enabled": rule.get("enabled") is not False,
        "startDate": rule.get("startDate") or "",
        "endDate": rule.get("endDate") or "",
        "frequency": frequency,
        "customInterval": custom_interval,
        "customUnit": custom_unit,
        "type": rule.get("type") or "Expense",
        "category": rule.get("category") or "",
        "subcategory": rule.get("subcategory") or "",
        "account": rule.get("account") or "",
        "merchantPayee": rule.get("merchantPayee") or "",
        "description": rule.get("description") or "",
        "amount": abs(float(rule.get("amount", 0) or 0)) or 0.0,
        "currency": rule.get("currency") or fallback_currency or "USD",
        "essential": bool(rule.get("essential")),
        "reimbursable": bool(rule.get("reimbursable")),
        "notes": rule.get("notes") or "",
    }


def get_due_dates_for_rule(
    rule: dict,
    current_date: date | None = None,
    existing_transactions: list[dict] | None = None,
) -> list[str]:
    if existing_transactions is None:
        existing_transactions = []

    normalized = normalize_automatic_transaction_rule(rule)
    start = _parse_local_date(normalized["startDate"])
    current = _parse_local_date(_to_local_date(current_date or date.today()))
    end_raw = normalized["endDate"]
    end = _parse_local_date(end_raw) if end_raw else None

    if not normalized["enabled"] or not normalized["id"] or not start or not current or start > current:
        return []
    if end and end < start:
        return []

    final_date = end if end and end < current else current
    existing_keys = {
        f"{t['sourceRuleId']}::{t['date']}"
        for t in existing_transactions
        if t.get("sourceRuleId") == normalized["id"]
    }
    iv = _interval_for_rule(normalized)
    due_dates: list[str] = []
    occurrence = 0
    cursor = start

    while cursor <= final_date:
        due_str = _format_local_date(cursor)
        if f"{normalized['id']}::{due_str}" not in existing_keys:
            due_dates.append(due_str)
        occurrence += 1
        cursor = _add_interval(start, occurrence, iv["interval"], iv["unit"])

    return due_dates


def generate_automatic_transactions(
    state: dict,
    current_date: date | None = None,
) -> dict:
    """Return {state, generated, skipped}.  Mutates state by prepending generated transactions."""
    generated: list[dict] = []
    skipped: list[dict] = []
    existing = list(state.get("transactions", []))
    currency = state.get("currency", "USD")

    for raw_rule in state.get("automaticTransactions", []):
        rule = normalize_automatic_transaction_rule(raw_rule, currency)

        if not _is_valid_rule(rule):
            skipped.append({"ruleId": rule["id"], "reason": "INVALID_RULE"})
            continue

        due_dates = get_due_dates_for_rule(rule, current_date, existing + generated)

        for due_str in due_dates:
            generated.append({
                "id": f"auto-{rule['id']}-{due_str}",
                "date": due_str,
                "month": get_transaction_month(due_str),
                "type": rule["type"],
                "category": rule["category"],
                "subcategory": rule["subcategory"],
                "account": rule["account"],
                "merchantPayee": rule["merchantPayee"],
                "description": rule["description"],
                "amount": rule["amount"],
                "currency": rule["currency"],
                "essential": rule["essential"],
                "reimbursable": rule["reimbursable"],
                "notes": rule["notes"],
                "sourceRuleId": rule["id"],
            })

    if generated:
        new_state = dict(state)
        new_state["transactions"] = generated + existing
        return {"state": new_state, "generated": generated, "skipped": skipped}

    return {"state": state, "generated": [], "skipped": skipped}
