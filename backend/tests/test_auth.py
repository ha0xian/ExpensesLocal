from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser, create_session_token, get_current_user


def request(path="/api/state", cookies=None):
    return SimpleNamespace(url=SimpleNamespace(path=path), cookies=cookies or {})


def test_health_skips_auth(monkeypatch):
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    assert get_current_user(request("/api/health")) is None


def test_missing_cookie_is_rejected(monkeypatch):
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    with pytest.raises(HTTPException) as exc:
        get_current_user(request())
    assert exc.value.status_code == 401


def test_signed_cookie_returns_user(monkeypatch):
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    monkeypatch.setenv("AUTH_SECRET", "test-secret-that-is-at-least-32-characters")
    user = AuthenticatedUser(id="user-123", email="person@example.com")
    token = create_session_token(user)
    assert get_current_user(request(cookies={"expense_session": token})) == user


def test_disabled_auth_uses_local_identity(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "true")
    user = get_current_user(request())
    assert user.id == "local-development"


def test_state_endpoint_requires_authentication(monkeypatch):
    from app.main import app
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    response = TestClient(app, raise_server_exceptions=False).get("/api/state")
    assert response.status_code == 401


def test_register_sets_http_only_session_cookie(monkeypatch):
    from app.main import app
    import app.auth_routes as auth_routes

    user = AuthenticatedUser(id="user-123", email="person@example.com")
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    monkeypatch.setenv("AUTH_SECRET", "test-secret-that-is-at-least-32-characters")
    monkeypatch.setenv("COOKIE_SECURE", "false")
    monkeypatch.setattr(auth_routes, "register_user", lambda email, password: user)

    response = TestClient(app).post(
        "/api/auth/register",
        json={"email": user.email, "password": "password123"},
    )

    assert response.status_code == 201
    assert response.json()["user"] == {"id": user.id, "email": user.email}
    cookie = response.headers["set-cookie"]
    assert "expense_session=" in cookie
    assert "HttpOnly" in cookie
