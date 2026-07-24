"""Registration, login, logout, and session endpoints."""

import os

from fastapi import APIRouter, HTTPException, Request, Response

from .auth import (
    SESSION_COOKIE,
    SESSION_DAYS,
    authenticate_user,
    create_session_token,
    get_current_user,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def _credentials(payload: dict) -> tuple[str, str]:
    email = str(payload.get("email", ""))
    password = str(payload.get("password", ""))
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    return email, password


def _set_session(response: Response, token: str) -> None:
    secure = os.environ.get("COOKIE_SECURE", "true").lower() not in {"0", "false", "no"}
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", status_code=201)
def register(payload: dict, response: Response):
    user = register_user(*_credentials(payload))
    _set_session(response, create_session_token(user))
    return {"user": {"id": user.id, "email": user.email}}


@router.post("/login")
def login(payload: dict, response: Response):
    user = authenticate_user(*_credentials(payload))
    _set_session(response, create_session_token(user))
    return {"user": {"id": user.id, "email": user.email}}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "signed_out"}


@router.get("/me")
def me(request: Request):
    user = get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return {"user": {"id": user.id, "email": user.email}}
