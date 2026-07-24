"""Application-owned authentication backed by PostgreSQL."""

from __future__ import annotations

import os
import uuid
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request
from pwdlib import PasswordHash

SESSION_COOKIE = "expense_session"
SESSION_DAYS = 7
PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/register",
    "/api/auth/login",
}

_password_hash = PasswordHash.recommended()
_current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str


def auth_disabled() -> bool:
    return os.environ.get("AUTH_DISABLED", "").lower() in {"1", "true", "yes"}


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise HTTPException(status_code=503, detail="DATABASE_URL is required for authentication.")
    return url


def _auth_secret() -> str:
    secret = os.environ.get("AUTH_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="AUTH_SECRET must contain at least 32 characters.")
    return secret


def _connect():
    import psycopg
    return psycopg.connect(_database_url(), autocommit=True, prepare_threshold=None)


def ensure_users_table(cursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY,
            email text NOT NULL UNIQUE,
            password_hash text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def register_user(email: str, password: str) -> AuthenticatedUser:
    normalized = email.strip().lower()
    if "@" not in normalized or len(normalized) > 320:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(password) < 8 or len(password) > 128:
        raise HTTPException(status_code=400, detail="Password must be between 8 and 128 characters.")

    user = AuthenticatedUser(id=str(uuid.uuid4()), email=normalized)
    try:
        with _connect() as conn:
            with conn.cursor() as cursor:
                ensure_users_table(cursor)
                cursor.execute(
                    "INSERT INTO users (id, email, password_hash) VALUES (%s, %s, %s)",
                    (user.id, user.email, _password_hash.hash(password)),
                )
    except Exception as exc:
        if getattr(exc, "sqlstate", None) == "23505":
            raise HTTPException(status_code=409, detail="An account with that email already exists.") from exc
        raise
    return user


def authenticate_user(email: str, password: str) -> AuthenticatedUser:
    normalized = email.strip().lower()
    with _connect() as conn:
        with conn.cursor() as cursor:
            ensure_users_table(cursor)
            cursor.execute("SELECT id, email, password_hash FROM users WHERE email = %s", (normalized,))
            row = cursor.fetchone()
    if not row or not _password_hash.verify(password, row[2]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return AuthenticatedUser(id=str(row[0]), email=row[1])


def create_session_token(user: AuthenticatedUser) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user.id, "email": user.email, "iat": now, "exp": now + timedelta(days=SESSION_DAYS)},
        _auth_secret(),
        algorithm="HS256",
    )


def get_current_user(request: Request) -> AuthenticatedUser | None:
    if request.url.path in PUBLIC_PATHS:
        return None
    if auth_disabled():
        return AuthenticatedUser(id="local-development", email="local@development")
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        payload = jwt.decode(token, _auth_secret(), algorithms=["HS256"])
        user_id, email = payload.get("sub"), payload.get("email")
        if not user_id or not email:
            raise jwt.InvalidTokenError("Missing user claims")
        return AuthenticatedUser(id=user_id, email=email)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc


def current_user_id() -> str:
    if auth_disabled():
        return "local-development"
    user_id = _current_user_id.get()
    if not user_id:
        raise RuntimeError("No authenticated user is available for this request.")
    return user_id


def bind_current_user(user_id: str):
    return _current_user_id.set(user_id)


def reset_current_user(token) -> None:
    _current_user_id.reset(token)
