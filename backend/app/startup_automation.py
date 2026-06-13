"""Port of startup automation from src/lib/startup-automation.js."""

from __future__ import annotations

import re
from datetime import date

from .automatic_transactions import generate_automatic_transactions
from .schema_defaults import MONTHS_2026

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _to_local_date(value) -> str:
    if isinstance(value, date):
        return f"{value.year}-{value.month:02d}-{value.day:02d}"
    if isinstance(value, str):
        if _DATE_RE.match(value):
            return value
    return _to_local_date(date.today())


def _normalize_date(value: str) -> str:
    text = str(value or "").strip()
    return text if _DATE_RE.match(text) else ""


def run_startup_automation(
    state: dict,
    current_date: date | None = None,
) -> dict:
    """Return {state, changed, previousAccessDate, currentAccessDate, actions}."""
    current_access_date = _to_local_date(current_date or date.today())
    current_month = current_access_date[:7]
    previous_access_date = _normalize_date(state.get("lastAccessedAt", ""))
    last_automation_run_date = _normalize_date(state.get("lastAutomationRunAt", ""))
    actions: list[str] = []
    next_state = dict(state)
    changed = False

    if last_automation_run_date != current_access_date and previous_access_date != current_access_date:
        next_state["lastAccessedAt"] = current_access_date
        next_state["lastAutomationRunAt"] = current_access_date
        changed = True

        if not previous_access_date:
            actions.append("UPDATED_LAST_ACCESS")
        elif previous_access_date > current_access_date:
            actions.append("LAST_ACCESS_IN_FUTURE_CORRECTED")
        else:
            actions.append("UPDATED_LAST_ACCESS")

        if previous_access_date and previous_access_date[:7] != current_month and current_month in MONTHS_2026:
            next_state["selectedMonth"] = current_month
            actions.append("ADVANCED_SELECTED_MONTH")

    generation = generate_automatic_transactions(next_state, current_date)
    if generation["generated"]:
        next_state = generation["state"]
        changed = True
        actions.append("GENERATED_AUTOMATIC_TRANSACTIONS")

    return {
        "state": next_state,
        "changed": changed,
        "previousAccessDate": previous_access_date,
        "currentAccessDate": current_access_date,
        "actions": actions,
    }
