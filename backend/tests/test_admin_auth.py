"""Integration tests for backoffice admin auth (login → email OTP → token)."""

import uuid

import pytest

from app.core import create_access_token


@pytest.mark.asyncio
async def test_admin_login_otp_then_token(client, make_admin, otp_sink):
    creds = await make_admin()

    # Step 1: credentials → OTP sent, no token yet.
    r = await client.post("/api/v1/admin/auth/login", json={**creds, "remember": False})
    assert r.status_code == 200, r.text
    assert r.json()["otp_required"] is True
    code = otp_sink[creds["email"]]

    # Step 2: OTP → admin token.
    r = await client.post("/api/v1/admin/auth/verify-otp", json={"email": creds["email"], "code": code})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    me = await client.get("/api/v1/admin/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == creds["email"]


@pytest.mark.asyncio
async def test_admin_login_wrong_password(client, make_admin, otp_sink):
    creds = await make_admin()
    r = await client.post("/api/v1/admin/auth/login", json={"email": creds["email"], "password": "nope"})
    assert r.status_code == 401
    assert creds["email"] not in otp_sink  # no OTP emailed on bad credentials


@pytest.mark.asyncio
async def test_admin_wrong_otp_rejected(client, make_admin, otp_sink):
    creds = await make_admin()
    await client.post("/api/v1/admin/auth/login", json=creds)
    r = await client.post("/api/v1/admin/auth/verify-otp", json={"email": creds["email"], "code": "000000"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_admin_route_requires_admin_token(client):
    # No / invalid token → 401.
    r = await client.get("/api/v1/admin/plans", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 401

    # A valid *user* token (no typ=admin claim) must be rejected too.
    user_token = create_access_token({"sub": str(uuid.uuid4())})
    r = await client.get("/api/v1/admin/plans", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_token_accesses_admin_route(client, make_admin, otp_sink):
    creds = await make_admin()
    await client.post("/api/v1/admin/auth/login", json=creds)
    code = otp_sink[creds["email"]]
    r = await client.post("/api/v1/admin/auth/verify-otp", json={"email": creds["email"], "code": code})
    token = r.json()["access_token"]

    r = await client.get("/api/v1/admin/plans", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)
