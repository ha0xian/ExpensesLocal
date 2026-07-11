"""HTTP API endpoints — thin handlers that delegate to state_service.

Every route is wrapped with _handle_errors so:
- ValueError          → HTTP 400
- LookupError         → HTTP 404
- FileNotFoundError   → HTTP 404
- HTTPException       → re-raised as-is
- unhandled Exception → HTTP 500
"""

from __future__ import annotations

from functools import wraps

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from .config import APP_NAME
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


def _handle_errors(fn):
    """Decorator that translates service-layer exceptions to HTTP responses."""

    @wraps(fn)
    async def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            import inspect
            if inspect.iscoroutine(result):
                result = await result
            return result
        except HTTPException:
            raise
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
@_handle_errors
def health():
    return {"status": "ok", "app": APP_NAME}


@router.get("/config")
@_handle_errors
def get_config():
    return get_snapshot(run_automation=False)


@router.get("/state")
@_handle_errors
def get_state():
    return get_snapshot(run_automation=True)


@router.put("/state/month")
@_handle_errors
async def put_state_month(payload: dict):
    month = payload.get("month", "")
    if not month:
        raise HTTPException(status_code=400, detail="Month is required.")
    return update_selected_month(month)


# ---------------------------------------------------------------------------
# CSV import / export
# ---------------------------------------------------------------------------

@router.post("/csv/import")
@_handle_errors
async def csv_import(payload: dict):
    csv_text = payload.get("csvText", "")
    if not csv_text:
        raise HTTPException(status_code=400, detail="csvText is required.")
    return replace_state_from_csv(csv_text)


@router.get("/csv/export")
@_handle_errors
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
@_handle_errors
async def post_transaction(payload: dict):
    return create_transaction(payload)


@router.patch("/transactions/{transaction_id}")
@_handle_errors
async def patch_transaction(transaction_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return update_transaction(transaction_id, field, value)


@router.delete("/transactions/{transaction_id}")
@_handle_errors
def delete_transaction_route(transaction_id: str):
    return delete_transaction(transaction_id)


# ---------------------------------------------------------------------------
# Automatic transactions
# ---------------------------------------------------------------------------

@router.post("/automatic-transactions")
@_handle_errors
async def post_automatic_transaction(payload: dict):
    return create_automatic_transaction(payload)


@router.patch("/automatic-transactions/{rule_id}")
@_handle_errors
async def patch_automatic_transaction(rule_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return update_automatic_transaction(rule_id, field, value)


@router.delete("/automatic-transactions/{rule_id}")
@_handle_errors
def delete_automatic_transaction_route(rule_id: str):
    return delete_automatic_transaction(rule_id)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.post("/categories")
@_handle_errors
async def post_category(payload: dict):
    return create_category(payload)


@router.patch("/categories/{category_id}")
@_handle_errors
async def patch_category(category_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return update_category(category_id, field, value)


@router.delete("/categories/{category_id}")
@_handle_errors
def delete_category_route(category_id: str):
    return delete_category(category_id)


# ---------------------------------------------------------------------------
# Subcategories
# ---------------------------------------------------------------------------

@router.post("/subcategories")
@_handle_errors
async def post_subcategory(payload: dict):
    return create_subcategory(payload)


@router.patch("/subcategories/{subcategory_id}")
@_handle_errors
async def patch_subcategory(subcategory_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return update_subcategory(subcategory_id, field, value)


@router.delete("/subcategories/{subcategory_id}")
@_handle_errors
def delete_subcategory_route(subcategory_id: str):
    return delete_subcategory(subcategory_id)


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

@router.post("/accounts")
@_handle_errors
async def post_account(payload: dict):
    return create_account(payload)


@router.patch("/accounts/{account_id}")
@_handle_errors
async def patch_account(account_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return update_account(account_id, field, value)


@router.delete("/accounts/{account_id}")
@_handle_errors
def delete_account_route(account_id: str):
    return delete_account(account_id)


# ---------------------------------------------------------------------------
# Monthly setup
# ---------------------------------------------------------------------------

@router.patch("/monthly-setup/{setup_id}")
@_handle_errors
async def patch_monthly_setup(setup_id: str, payload: dict):
    field = payload.get("field", "")
    value = payload.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Field is required.")
    return update_monthly_setup(setup_id, field, value)


@router.post("/monthly-setup/fill-missing")
@_handle_errors
def fill_missing():
    return fill_missing_monthly_setup()


# ---------------------------------------------------------------------------
# Bank import
# ---------------------------------------------------------------------------

@router.post("/bank-import/preview")
@_handle_errors
async def bank_import_preview_route(payload: dict):
    csv_text = payload.get("csvText", "")
    if not csv_text:
        raise HTTPException(status_code=400, detail="csvText is required.")
    mapping = payload.get("mapping", None)
    return bank_import_preview(csv_text, mapping)


@router.post("/bank-import/apply")
@_handle_errors
async def bank_import_apply_route(payload: dict):
    rows = payload.get("rows", [])
    mapping = payload.get("mapping", {})
    if not rows or not mapping:
        raise HTTPException(status_code=400, detail="rows and mapping are required.")
    return bank_import_apply(rows, mapping)
