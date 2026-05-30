"""Integration tests for the password reset flow (forgot → OTP → reset)."""

import pytest

REG = {"email": "bob@example.com", "first_name": "Bob", "last_name": "Durand", "password": "originalpass1"}


async def _register_verified(client, otp_sink):
    await client.post("/api/v1/auth/register", json=REG)
    code = otp_sink[REG["email"]]
    await client.post("/api/v1/auth/verify-email", json={"email": REG["email"], "code": code})


@pytest.mark.asyncio
async def test_forgot_password_is_anti_enumeration(client, otp_sink):
    # Unknown email → still 204, and no OTP generated.
    r = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 204
    assert "nobody@example.com" not in otp_sink


@pytest.mark.asyncio
async def test_reset_password_flow(client, otp_sink):
    await _register_verified(client, otp_sink)

    # Forgot → OTP emailed.
    r = await client.post("/api/v1/auth/forgot-password", json={"email": REG["email"]})
    assert r.status_code == 204
    code = otp_sink[REG["email"]]

    # Reset with the code → token (auto-login).
    r = await client.post("/api/v1/auth/reset-password", json={
        "email": REG["email"], "code": code, "new_password": "brandnewpass2",
    })
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]

    # Old password no longer works; new one does.
    r = await client.post("/api/v1/auth/login", json={"email": REG["email"], "password": REG["password"]})
    assert r.status_code == 401
    r = await client.post("/api/v1/auth/login", json={"email": REG["email"], "password": "brandnewpass2"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_reset_wrong_code_rejected(client, otp_sink):
    await _register_verified(client, otp_sink)
    await client.post("/api/v1/auth/forgot-password", json={"email": REG["email"]})
    r = await client.post("/api/v1/auth/reset-password", json={
        "email": REG["email"], "code": "000000", "new_password": "whatever123",
    })
    assert r.status_code == 400
