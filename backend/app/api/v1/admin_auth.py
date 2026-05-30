"""
Backoffice admin authentication: email + password + email-OTP 2FA, invitations.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.config import get_settings
from app.core import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.admin_user import AdminUser
from app.schemas.admin_auth import (
    AcceptInviteRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminResponse,
    AdminTokenResponse,
    AdminUpdateProfileRequest,
    AdminVerifyOtpRequest,
)
from app.services import otp_service
from datetime import datetime, timezone

router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])


def _admin_token(admin: AdminUser, remember: bool) -> str:
    settings = get_settings()
    expires = (
        timedelta(days=settings.JWT_REMEMBER_DAYS)
        if remember
        else timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    )
    return create_access_token(data={"sub": str(admin.id), "typ": "admin"}, expires_delta=expires)


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(data: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """Step 1: verify credentials, then email a 2FA OTP. No token yet."""
    result = await db.execute(select(AdminUser).where(AdminUser.email == data.email))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active or not admin.password_hash or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    await otp_service.create_and_send_otp(
        db, email=admin.email, purpose="login_2fa", subject_type="admin", subject_id=admin.id,
    )
    return AdminLoginResponse(email=admin.email)


@router.post("/verify-otp", response_model=AdminTokenResponse)
async def admin_verify_otp(data: AdminVerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """Step 2: verify the OTP and issue an admin JWT."""
    ok = await otp_service.verify_otp(db, data.email, "login_2fa", data.code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    result = await db.execute(select(AdminUser).where(AdminUser.email == data.email))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found or inactive")

    admin.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(admin)

    return AdminTokenResponse(access_token=_admin_token(admin, data.remember), admin=AdminResponse.model_validate(admin))


@router.post("/accept-invite", response_model=AdminTokenResponse)
async def accept_invite(data: AcceptInviteRequest, db: AsyncSession = Depends(get_db)):
    """Set the password for an invited admin. Token format: '<admin_id>.<secret>'."""
    import uuid

    if "." not in data.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite token")
    admin_id_str, secret = data.token.split(".", 1)
    try:
        admin_id = uuid.UUID(admin_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite token")

    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin or not admin.invite_token_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or used invite")

    expires = admin.invite_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires is None or expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation expired")

    if not verify_password(secret, admin.invite_token_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite token")

    admin.password_hash = hash_password(data.password)
    admin.invite_token_hash = None
    admin.invite_expires_at = None
    admin.is_active = True
    admin.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(admin)

    return AdminTokenResponse(access_token=_admin_token(admin, False), admin=AdminResponse.model_validate(admin))


@router.get("/me", response_model=AdminResponse)
async def admin_me(admin: AdminUser = Depends(get_current_admin)):
    return AdminResponse.model_validate(admin)


@router.put("/me", response_model=AdminResponse)
async def admin_update_me(
    data: AdminUpdateProfileRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if data.first_name is not None:
        admin.first_name = data.first_name
    if data.last_name is not None:
        admin.last_name = data.last_name

    if data.new_password:
        if not data.current_password or not admin.password_hash or not verify_password(data.current_password, admin.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        admin.password_hash = hash_password(data.new_password)

    if data.email and data.email != admin.email:
        exists = (await db.execute(select(AdminUser).where(AdminUser.email == data.email))).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already used")
        admin.email = data.email

    await db.commit()
    await db.refresh(admin)
    return AdminResponse.model_validate(admin)
