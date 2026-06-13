"""HTTP API endpoints — thin handlers that delegate to state_service."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response

from .state_service import (
    bank_import_apply,
    bank_import_preview,
    create_account,
    create_automatic_transaction,
    create_category,
    create_subcategory,
    create_transaction,
    delete_account,
    delete_automatic_transaction,
    delete_category,
    delete_subcategory,
    delete_transaction,
    export_csv,
    fill_missing_monthly_setup,
    get_snapshot,
    replace_state_from_csv,
    update_account,
    update_automatic_transaction,
    update_category,
    update_monthly_setup,
    update_selected_month,
    update_subcategory,
    update_transaction,
)

router = APIRouter(prefix="/api")


def _ok(data: dict) -> dict:
    return data


def _handle_errors(fn):
    """Decorator/wrapper to catch ValueError as 400 and others as 500."""
    from functools import wraps

    @wraps(fn)
    async def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            # support both sync and async
            import inspect
            if inspect.iscoroutine(result):
                result = await result
            return result
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except LookupError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return wrapper


# ---------------------------------------------------------------------------
# Health / config / state
# ---------------------------------------------------------------------------

@router.get("/health")
def health():
    return {"status": "ok", "app": "Envelope Expense CSV"}


@router.get("/config")
def get_config():
    snap = get_snapshot(run_automation=False)
    return _ok(snap)


@router.get("/state")
def get_state():
    snap = get_snapshot(run_automation=True)
    return _ok(snap)


@router.put("/state/month")
async def put_state_month(payload: dict):
    month = payload.get("month", "")
    if not month:
        raise HTTPException(status_code=400, detail="Month is required.")
    return _ok(update_selected_month(month))


# ---------------------------------------------------------------------------
# CSV import / export
# ---------------------------------------------------------------------------

@router.post("/csv/import")
async def csv_import(payload: dict):
    csv_text = payload.get("csvText", "")
    if not csv_text:
        raise HTTPException(status_code=400, detail="csvText is required.")
    try:
        return _ok(replace_state_from_csv(csv_text))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/csv/export")
def csv_export():
    csv_text = export_csv()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expense-data.csv"},
    )


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

@router.post("/transactions")
async def post_transaction(payload: dict):
    try:
        return _ok(create_transaction(payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/transactions/{transaction_id}")
async def patch_transaction(transaction_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return _ok(update_transaction(transaction_id, field, value))


@router.delete("/transactions/{transaction_id}")
def delete_transaction_route(transaction_id: str):
    return _ok(delete_transaction(transaction_id))


# ---------------------------------------------------------------------------
# Automatic transactions
# ---------------------------------------------------------------------------

@router.post("/automatic-transactions")
async def post_automatic_transaction(payload: dict):
    try:
        return _ok(create_automatic_transaction(payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/automatic-transactions/{rule_id}")
async def patch_automatic_transaction(rule_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return _ok(update_automatic_transaction(rule_id, field, value))


@router.delete("/automatic-transactions/{rule_id}")
def delete_automatic_transaction_route(rule_id: str):
    return _ok(delete_automatic_transaction(rule_id))


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.post("/categories")
async def post_category(payload: dict):
    try:
        return _ok(create_category(payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/categories/{category_id}")
async def patch_category(category_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return _ok(update_category(category_id, field, value))


@router.delete("/categories/{category_id}")
def delete_category_route(category_id: str):
    return _ok(delete_category(category_id))


# ---------------------------------------------------------------------------
# Subcategories
# ---------------------------------------------------------------------------

@router.post("/subcategories")
async def post_subcategory(payload: dict):
    try:
        return _ok(create_subcategory(payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/subcategories/{subcategory_id}")
async def patch_subcategory(subcategory_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return _ok(update_subcategory(subcategory_id, field, value))


@router.delete("/subcategories/{subcategory_id}")
def delete_subcategory_route(subcategory_id: str):
    return _ok(delete_subcategory(subcategory_id))


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

@router.post("/accounts")
async def post_account(payload: dict):
    try:
        return _ok(create_account(payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/accounts/{account_id}")
async def patch_account(account_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return _ok(update_account(account_id, field, value))


@router.delete("/accounts/{account_id}")
def delete_account_route(account_id: str):
    return _ok(delete_account(account_id))


# ---------------------------------------------------------------------------
# Monthly setup
# ---------------------------------------------------------------------------

@router.patch("/monthly-setup/{setup_id}")
async def patch_monthly_setup(setup_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return _ok(update_monthly_setup(setup_id, field, value))


@router.post("/monthly-setup/fill-missing")
def fill_missing():
    return _ok(fill_missing_monthly_setup())


# ---------------------------------------------------------------------------
# Bank import
# ---------------------------------------------------------------------------

@router.post("/bank-import/preview")
async def bank_import_preview_route(payload: dict):
    csv_text = payload.get("csvText", "")
    if not csv_text:
        raise HTTPException(status_code=400, detail="csvText is required.")
    mapping = payload.get("mapping", None)
    return _ok(bank_import_preview(csv_text, mapping))


@router.post("/bank-import/apply")
async def bank_import_apply_route(payload: dict):
    rows = payload.get("rows", [])
    mapping = payload.get("mapping", {})
    if not rows or not mapping:
        raise HTTPException(status_code=400, detail="rows and mapping are required.")
    return _ok(bank_import_apply(rows, mapping))
