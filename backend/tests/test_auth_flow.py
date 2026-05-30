"""Integration tests for the user auth flow (register → OTP → login)."""

import pytest

REG = {"email": "alice@example.com", "first_name": "Alice", "last_name": "Martin", "password": "supersecret1"}


async def _register(client, otp_sink, email="alice@example.com"):
    payload = {**REG, "email": email}
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201, r.text
    assert r.json()["verification_required"] is True
    return otp_sink[email]


@pytest.mark.asyncio
async def test_register_then_verify_then_me(client, otp_sink):
    code = await _register(client, otp_sink)

    r = await client.post("/api/v1/auth/verify-email", json={"email": REG["email"], "code": code})
    assert r.status_code == 200, r.text
    body = r.json()
    token = body["access_token"]
    assert body["user"]["email_verified"] is True
    assert body["user"]["first_name"] == "Alice"

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == REG["email"]


@pytest.mark.asyncio
async def test_login_blocked_until_verified(client, otp_sink):
    await _register(client, otp_sink)

    # Not verified yet → 403 with the sentinel detail the frontend keys on.
    r = await client.post("/api/v1/auth/login", json={"email": REG["email"], "password": REG["password"]})
    assert r.status_code == 403
    assert r.json()["detail"] == "email_not_verified"

    # Verify, then login works.
    await client.post("/api/v1/auth/verify-email", json={"email": REG["email"], "code": otp_sink[REG["email"]]})
    r = await client.post("/api/v1/auth/login", json={"email": REG["email"], "password": REG["password"]})
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client, otp_sink):
    await _register(client, otp_sink)
    await client.post("/api/v1/auth/verify-email", json={"email": REG["email"], "code": otp_sink[REG["email"]]})

    r = await client.post("/api/v1/auth/login", json={"email": REG["email"], "password": "wrongpass"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_verify_wrong_code_rejected(client, otp_sink):
    await _register(client, otp_sink)
    r = await client.post("/api/v1/auth/verify-email", json={"email": REG["email"], "code": "000000"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_is_anti_enumeration(client, otp_sink):
    # First registration creates the account.
    r1 = await client.post("/api/v1/auth/register", json=REG)
    assert r1.status_code == 201

    # Re-registering the SAME email must NOT leak existence (no 409, same shape).
    r2 = await client.post("/api/v1/auth/register", json=REG)
    assert r2.status_code == 201
    assert r2.json()["email"] == REG["email"]
