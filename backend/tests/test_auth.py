from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth import get_current_user


def request(path="/api/state"):
    return SimpleNamespace(url=SimpleNamespace(path=path))


def test_health_skips_auth(monkeypatch):
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    assert get_current_user(request("/api/health"), None) is None


def test_missing_token_is_rejected(monkeypatch):
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    with pytest.raises(HTTPException) as exc:
        get_current_user(request(), None)
    assert exc.value.status_code == 401


def test_disabled_auth_uses_local_identity(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "true")
    user = get_current_user(request(), None)
    assert user.id == "local-development"


def test_state_endpoint_requires_authentication(monkeypatch):
    from app.main import app
    monkeypatch.delenv("AUTH_DISABLED", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    response = TestClient(app, raise_server_exceptions=False).get("/api/state")
    assert response.status_code == 401
