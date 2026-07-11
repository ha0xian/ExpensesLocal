"""Port of bank CSV mapping and row conversion from src/lib/app-helpers.js."""

from __future__ import annotations

import re
import secrets
from .calculations import get_transaction_month


# Matches a numeric value that may be prefixed with $, contain commas,
# or have trailing minus/CR/DR markers.
_AMOUNT_CLEAN = re.compile(r"[^-+\d.]")


def _parse_amount(raw: str) -> float:
    """Robustly parse a bank amount string like '$1,234.56', '-12.34', '(99.99)', '1,234.56 CR' or ''."""
    text = str(raw or "").strip()
    if not text:
        return 0.0

    # Detect parentheses for negative: (123.45) → -123.45
    is_negative = False
    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1]
        is_negative = True

    # Detect trailing CR/DR markers
    upper = text.upper()
    if upper.endswith("CR"):
        text = text[:-2].strip()
    elif upper.endswith("DR"):
        text = text[:-2].strip()
        is_negative = True
    # Trailing minus
    if text.endswith("-"):
        text = text[:-1].strip()
        is_negative = True

    # Remove $, commas, spaces etc.
    cleaned = _AMOUNT_CLEAN.sub("", text)
    if not cleaned:
        return 0.0

    try:
        value = float(cleaned)
    except (ValueError, TypeError):
        return 0.0

    return -abs(value) if is_negative else value


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
        amount_raw = _parse_amount(row.get(mapping.get("amount", ""), ""))
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
