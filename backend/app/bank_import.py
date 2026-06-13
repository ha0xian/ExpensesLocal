"""Port of bank CSV mapping and row conversion from src/lib/app-helpers.js."""

from __future__ import annotations

import secrets
from .calculations import get_transaction_month


def guess_mapping(headers: list[str]) -> dict[str, str]:
    """Return a mapping dict guessing which header maps to which app field."""

    def find(*needles: str) -> str:
        for h in headers:
            hl = h.lower()
            for n in needles:
                if n in hl:
                    return h
        return ""

    return {
        "date": find("date", "posted"),
        "merchantPayee": find("merchant", "payee", "name"),
        "description": find("description", "memo"),
        "amount": find("amount", "debit", "credit"),
        "account": "",
        "category": "",
        "subcategory": "",
        "type": find("type"),
    }


def normalize_type(value: str) -> str:
    text = str(value).lower()
    if "income" in text or "credit" in text or "deposit" in text:
        return "Income"
    if "transfer" in text:
        return "Transfer"
    return "Expense"


def _unique_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4)}"


def map_bank_import_rows(
    rows: list[dict[str, str]],
    mapping: dict[str, str],
    state: dict,
) -> list[dict]:
    """Convert raw bank CSV rows into Transaction dicts using the mapping."""
    currency = state.get("currency", "USD")
    categories = state.get("categories", [])
    subcategories = state.get("subcategories", [])
    accounts = state.get("accounts", [])

    default_category = categories[0]["name"] if categories else ""

    def _subcategories_for(cat_name: str) -> list[dict]:
        return [s for s in subcategories if s["category"] == cat_name]

    def _first_subcategory(cat_name: str) -> str:
        subs = _subcategories_for(cat_name)
        return subs[0]["name"] if subs else ""

    default_account = accounts[0]["name"] if accounts else ""

    result = []
    for row in rows:
        amount_raw = float(row.get(mapping.get("amount", ""), 0) or 0)
        type_value = row.get(mapping.get("type", "")) if mapping.get("type") else ""
        inferred_type = type_value or ("Expense" if amount_raw < 0 else "Income")
        date_val = row.get(mapping.get("date", ""), "")
        category = row.get(mapping.get("category", "")) or default_category

        result.append({
            "id": _unique_id("imp"),
            "date": date_val,
            "type": normalize_type(inferred_type),
            "category": category,
            "subcategory": row.get(mapping.get("subcategory", "")) or _first_subcategory(category),
            "account": row.get(mapping.get("account", "")) or default_account,
            "merchantPayee": row.get(mapping.get("merchantPayee", ""), ""),
            "description": row.get(mapping.get("description", "")) or row.get(mapping.get("merchantPayee", ""), ""),
            "amount": abs(amount_raw),
            "currency": currency,
            "essential": False,
            "month": get_transaction_month(date_val),
            "reimbursable": False,
            "notes": "Imported from bank CSV",
        })
    return result
