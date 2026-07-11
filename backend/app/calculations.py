"""Port of business calculations from src/lib/calculations.js.

Amounts are positive; `type` controls cashflow direction.
"""

from __future__ import annotations

import re
from datetime import date, datetime

from .schema_defaults import MONTHS_2026

MONEY_EPSILON = 0.005


# ---------------------------------------------------------------------------
# Transaction month
# ---------------------------------------------------------------------------

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def get_transaction_month(date_string: str) -> str:
    """Return YYYY-MM for a valid YYYY-MM-DD date string, or ''."""
    if not _DATE_RE.match(str(date_string or "")):
        return ""
    parts = date_string.split("-")
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    try:
        d = date(year, month, day)
    except ValueError:
        return ""
    if d.year != year or d.month != month or d.day != day:
        return ""
    return f"{year}-{month:02d}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sum(values):
    return sum(float(v or 0) for v in values)


def _transactions_for_month(transactions: list[dict], month: str) -> list[dict]:
    return [
        t for t in transactions
        if (t.get("month") or get_transaction_month(t.get("date", ""))) == month
    ]


def _sorted_months(state: dict) -> list[str]:
    monthly_setup = state.get("monthlySetup", [])
    months = set(MONTHS_2026)
    for item in monthly_setup:
        months.add(item["month"])
    return sorted(months)


def _envelope_key(category: str, subcategory: str) -> str:
    return f"{category}::{subcategory}"


def _envelope_spending(state: dict, month: str, category: str, subcategory: str) -> float:
    return _sum(
        t["amount"]
        for t in _transactions_for_month(state.get("transactions", []), month)
        if t["type"] == "Expense" and t["category"] == category and t["subcategory"] == subcategory
    )


# ---------------------------------------------------------------------------
# Summary / dashboard
# ---------------------------------------------------------------------------

def summarize_month(state: dict, month: str) -> dict:
    transactions = _transactions_for_month(state.get("transactions", []), month)
    expenses = _sum(t["amount"] for t in transactions if t["type"] == "Expense")
    income = _sum(t["amount"] for t in transactions if t["type"] == "Income")
    category_rows = summarize_categories_for_month(state, month)
    top_category = "None"
    if category_rows:
        top = max(category_rows, key=lambda r: r["spend"])
        top_category = top["category"]

    return {
        "expenses": expenses,
        "income": income,
        "netCashflow": income - expenses,
        "transactionCount": len(transactions),
        "reimbursableTotal": _sum(t["amount"] for t in transactions if t.get("reimbursable")),
        "essentialSpend": _sum(
            t["amount"] for t in transactions
            if t.get("essential") and t["type"] == "Expense"
        ),
        "topCategory": top_category,
    }


def summarize_categories_for_month(state: dict, month: str) -> list[dict]:
    return [
        {
            "category": cat["name"],
            "spend": _sum(
                t["amount"]
                for t in _transactions_for_month(state.get("transactions", []), month)
                if t["type"] == "Expense" and t["category"] == cat["name"]
            ),
            "budget": float(cat.get("defaultBudget", 0) or 0),
        }
        for cat in state.get("categories", [])
    ]


def calculate_available_to_assign(state: dict, month: str) -> float:
    income = _sum(
        t["amount"]
        for t in _transactions_for_month(state.get("transactions", []), month)
        if t["type"] == "Income"
    )
    funding = _sum(
        item["monthlyTarget"]
        for item in state.get("monthlySetup", [])
        if item["month"] == month
    )
    return income - funding


def calculate_envelope_balances(state: dict, month: str) -> list[dict]:
    months = _sorted_months(state)
    try:
        target_index = months.index(month)
    except ValueError:
        return []

    balances: dict[str, float] = {}
    target_rows: list[dict] = []

    for current_month in months[: target_index + 1]:
        for setup in state.get("monthlySetup", []):
            if setup["month"] != current_month:
                continue
            key = _envelope_key(setup["category"], setup["subcategory"])
            previous = balances.get(key, 0.0)
            rollover_in = previous if setup.get("rollover") else 0.0
            spending = _envelope_spending(state, current_month, setup["category"], setup["subcategory"])
            available = float(setup.get("startingBalance", 0) or 0) + rollover_in + float(setup.get("monthlyTarget", 0) or 0) - spending
            balances[key] = available

            row = {
                "category": setup["category"],
                "subcategory": setup["subcategory"],
                "monthlyTarget": float(setup.get("monthlyTarget", 0) or 0),
                "startingBalance": float(setup.get("startingBalance", 0) or 0),
                "rolloverIn": rollover_in,
                "spending": spending,
                "available": available,
                "overdrawn": available < -MONEY_EPSILON,
            }
            if current_month == month:
                target_rows.append(row)

    return target_rows


def calculate_account_balances(state: dict) -> list[dict]:
    result = []
    for account in state.get("accounts", []):
        account_transactions = [
            t for t in state.get("transactions", [])
            if t.get("account") == account["name"]
        ]
        expenses = _sum(t["amount"] for t in account_transactions if t["type"] == "Expense")
        income = _sum(t["amount"] for t in account_transactions if t["type"] == "Income")
        opening_balance = float(account.get("openingBalance", 0) or 0)
        if account.get("type") == "Credit Card":
            current_balance = opening_balance - expenses + income
        else:
            current_balance = opening_balance + income - expenses

        result.append({
            "account": account["name"],
            "type": account.get("type", "Bank"),
            "openingBalance": opening_balance,
            "currentBalance": current_balance,
        })
    return result


def collect_warnings(state: dict, month: str) -> list[dict]:
    """Return list of WarningItem dicts."""
    warnings: list[dict] = []

    category_names = {c["name"] for c in state.get("categories", [])}
    account_names = {a["name"] for a in state.get("accounts", [])}
    subcategory_map = {f"{s['category']}::{s['name']}": s for s in state.get("subcategories", [])}
    subcategory_names = {s["name"] for s in state.get("subcategories", [])}

    # overdrawn envelopes
    for envelope in calculate_envelope_balances(state, month):
        if envelope["overdrawn"]:
            warnings.append({
                "severity": "error",
                "code": "ENVELOPE_OVERDRAWN",
                "message": f"{envelope['category']} / {envelope['subcategory']} is overdrawn by ${abs(envelope['available']):.2f}.",
                "entityId": None,
            })

    # over-assigned
    if calculate_available_to_assign(state, month) < -MONEY_EPSILON:
        warnings.append({
            "severity": "warning",
            "code": "OVER_ASSIGNED",
            "message": "Monthly envelope funding is greater than income for the selected month.",
            "entityId": None,
        })

    # per-transaction
    for t in state.get("transactions", []):
        tid = t.get("id", "")

        if t["category"] not in category_names:
            warnings.append({
                "severity": "warning", "code": "MISSING_CATEGORY",
                "message": f"Transaction {tid} uses an unknown category.",
                "entityId": tid,
            })
        if t["subcategory"] not in subcategory_names:
            warnings.append({
                "severity": "warning", "code": "MISSING_SUBCATEGORY",
                "message": f"Transaction {tid} uses an unknown subcategory.",
                "entityId": tid,
            })
        elif f"{t['category']}::{t['subcategory']}" not in subcategory_map:
            warnings.append({
                "severity": "warning", "code": "SUBCATEGORY_MISMATCH",
                "message": f"Transaction {tid} subcategory does not belong to {t['category']}.",
                "entityId": tid,
            })
        if t["account"] not in account_names:
            warnings.append({
                "severity": "warning", "code": "MISSING_ACCOUNT",
                "message": f"Transaction {tid} has no valid account.",
                "entityId": tid,
            })
        if not get_transaction_month(t.get("date", "")):
            warnings.append({
                "severity": "error", "code": "INVALID_DATE",
                "message": f"Transaction {tid} has an invalid date.",
                "entityId": tid,
            })
        amt = t.get("amount", 0)
        if not isinstance(amt, (int, float)) or amt != amt or amt <= 0:
            warnings.append({
                "severity": "error", "code": "INVALID_AMOUNT",
                "message": f"Transaction {tid} has an invalid amount.",
                "entityId": tid,
            })

    return warnings


def build_derived_state(state: dict) -> dict:
    """Return a DerivedState-shaped dict for the selected month."""
    month = state.get("selectedMonth", "2026-01")
    return {
        "summary": summarize_month(state, month),
        "categoryRows": summarize_categories_for_month(state, month),
        "availableToAssign": calculate_available_to_assign(state, month),
        "envelopeRows": calculate_envelope_balances(state, month),
        "accountBalances": calculate_account_balances(state),
        "warnings": collect_warnings(state, month),
    }
