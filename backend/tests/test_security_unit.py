"""Unit tests for security-critical pure logic (no DB needed)."""

from datetime import timedelta
from types import SimpleNamespace

import pytest
from starlette.requests import Request

from app.config import Environment, Settings
from app.core import create_access_token, decode_access_token
from app.main import _validate_production_settings
import app.ratelimit as ratelimit


def _make_request(peer: str, xff: str | None = None) -> Request:
    headers = []
    if xff is not None:
        headers.append((b"x-forwarded-for", xff.encode()))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": headers,
        "client": (peer, 12345),
    }
    return Request(scope)


def _patch_trusted(monkeypatch, proxies: list[str]):
    monkeypatch.setattr(
        ratelimit, "get_settings",
        lambda: SimpleNamespace(trusted_proxies_list=proxies),
    )


# ─── Rate-limit client IP (anti-spoofing) ─────────────────────────────────────

def test_xff_ignored_when_no_trusted_proxies(monkeypatch):
    _patch_trusted(monkeypatch, [])
    req = _make_request("203.0.113.7", xff="1.1.1.1")
    assert ratelimit.get_client_ip(req) == "203.0.113.7"


def test_xff_ignored_when_peer_not_trusted(monkeypatch):
    _patch_trusted(monkeypatch, ["10.0.0.0/8"])
    # Direct peer is public, not a trusted proxy → header must be ignored.
    req = _make_request("203.0.113.7", xff="1.1.1.1")
    assert ratelimit.get_client_ip(req) == "203.0.113.7"


def test_xff_honored_from_trusted_proxy(monkeypatch):
    _patch_trusted(monkeypatch, ["10.0.0.0/8"])
    # Peer is the trusted proxy; the real client is the right-most untrusted hop.
    req = _make_request("10.1.2.3", xff="198.51.100.9, 10.1.2.3")
    assert ratelimit.get_client_ip(req) == "198.51.100.9"


def test_spoofed_left_most_xff_is_not_trusted(monkeypatch):
    _patch_trusted(monkeypatch, ["10.0.0.0/8"])
    # Attacker prepends a fake left-most value; we must NOT return it.
    req = _make_request("10.1.2.3", xff="6.6.6.6, 198.51.100.9, 10.1.2.3")
    assert ratelimit.get_client_ip(req) == "198.51.100.9"


# ─── Production fail-fast ─────────────────────────────────────────────────────

def test_validate_production_rejects_insecure():
    settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET="CHANGE-ME-IN-PRODUCTION-min-32-chars",
        ENCRYPTION_KEY="",
        SMTP_HOST="",
    )
    with pytest.raises(RuntimeError):
        _validate_production_settings(settings)


def test_validate_production_accepts_secure():
    settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET="x" * 40,
        ENCRYPTION_KEY="some-fernet-key",
        SMTP_HOST="smtp.example.com",
    )
    _validate_production_settings(settings)  # must not raise


def test_validate_development_is_noop():
    settings = Settings(ENVIRONMENT="development", JWT_SECRET="short", ENCRYPTION_KEY="", SMTP_HOST="")
    _validate_production_settings(settings)  # dev → never raises


# ─── JWT user/admin separation ────────────────────────────────────────────────

def test_jwt_roundtrip_and_typ_claim():
    user_token = create_access_token({"sub": "user-1"}, expires_delta=timedelta(minutes=5))
    admin_token = create_access_token({"sub": "admin-1", "typ": "admin"}, expires_delta=timedelta(minutes=5))

    user_payload = decode_access_token(user_token)
    admin_payload = decode_access_token(admin_token)

    assert user_payload["sub"] == "user-1"
    assert "typ" not in user_payload  # user tokens carry no admin claim
    assert admin_payload["typ"] == "admin"


def test_decode_rejects_garbage():
    assert decode_access_token("not.a.jwt") is None
