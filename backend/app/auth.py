"""Supabase JWT authentication for protected API routes."""

from __future__ import annotations

import os
from contextvars import ContextVar
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException, Request
from jwt import PyJWKClient

_current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None = None


def auth_disabled() -> bool:
    return os.environ.get("AUTH_DISABLED", "").lower() in {"1", "true", "yes"}


def current_user_id() -> str:
    user_id = _current_user_id.get()
    if not user_id:
        raise RuntimeError("No authenticated user is available for this request.")
    return user_id


def bind_current_user(user_id: str):
    return _current_user_id.set(user_id)


def reset_current_user(token) -> None:
    _current_user_id.reset(token)


def get_current_user(request: Request, authorization: str | None = Header(default=None)) -> AuthenticatedUser | None:
    if request.url.path == "/api/health":
        return None
    if auth_disabled():
        user = AuthenticatedUser(id="local-development", email="local@development")
        _current_user_id.set(user.id)
        return user

    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not supabase_url:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization[7:].strip()
    try:
        signing_key = PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json").get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=f"{supabase_url}/auth/v1",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise jwt.InvalidTokenError("Missing subject")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc

    user = AuthenticatedUser(id=user_id, email=payload.get("email"))
    return user
