"""OTP lifecycle: generate, store (hashed), email, and verify one-time codes."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import get_settings
from app.core import hash_password, verify_password
from app.models.otp_code import OtpCode
from app.services.email_service import send_otp_email


def _generate_code() -> str:
    """6-digit numeric code."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def create_and_send_otp(
    db: AsyncSession,
    email: str,
    purpose: str,
    subject_type: str,
    subject_id: uuid.UUID | None = None,
) -> None:
    """Invalidate previous codes for (email, purpose), create a new one, email it."""
    settings = get_settings()

    # Invalidate any outstanding codes for this email+purpose
    await db.execute(
        update(OtpCode)
        .where(
            OtpCode.email == email,
            OtpCode.purpose == purpose,
            OtpCode.consumed.is_(False),
        )
        .values(consumed=True)
    )

    code = _generate_code()
    otp = OtpCode(
        email=email,
        code_hash=hash_password(code),
        purpose=purpose,
        subject_type=subject_type,
        subject_id=subject_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_TTL_MINUTES),
    )
    db.add(otp)
    await db.commit()

    await send_otp_email(email, code, purpose)


async def verify_otp(db: AsyncSession, email: str, purpose: str, code: str) -> bool:
    """Verify a code: must be the latest unconsumed, unexpired, attempts < max."""
    settings = get_settings()

    result = await db.execute(
        select(OtpCode)
        .where(
            OtpCode.email == email,
            OtpCode.purpose == purpose,
            OtpCode.consumed.is_(False),
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    if not otp:
        return False

    now = datetime.now(timezone.utc)
    expires_at = otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp.consumed = True
        await db.commit()
        return False

    otp.attempts += 1
    if not verify_password(code, otp.code_hash):
        await db.commit()
        return False

    otp.consumed = True
    await db.commit()
    return True
