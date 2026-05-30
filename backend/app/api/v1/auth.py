"""
Auth routes — register (+ email OTP), login, current user, profile update.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core import create_access_token, hash_password, verify_password, generate_api_key
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.ratelimit import limiter
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    ResendOtpRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services import otp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_for(user: User, remember: bool) -> str:
    settings = get_settings()
    expires = (
        timedelta(days=settings.JWT_REMEMBER_DAYS)
        if remember
        else timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    )
    return create_access_token(data={"sub": str(user.id)}, expires_delta=expires)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user. Account requires email verification (OTP) before login.

    Anti-enumeration: the response is identical whether or not the email already
    exists. If it exists and is unverified, we (re)send the verification code.
    """
    settings = get_settings()
    if not settings.SAAS_MODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration disabled")

    existing = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing:
        if not existing.email_verified:
            await otp_service.create_and_send_otp(
                db, email=existing.email, purpose="email_verification",
                subject_type="user", subject_id=existing.id,
            )
        return RegisterResponse(email=data.email)

    user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        password_hash=hash_password(data.password),
        api_key=generate_api_key(),
        email_verified=False,
    )
    db.add(user)
    await db.commit()

    await otp_service.create_and_send_otp(
        db, email=user.email, purpose="email_verification",
        subject_type="user", subject_id=user.id,
    )
    return RegisterResponse(email=user.email)


@router.post("/verify-email", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_email(request: Request, data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Verify the email OTP, activate the account, and return a session token."""
    ok = await otp_service.verify_otp(db, data.email, "email_verification", data.code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.email_verified = True
    await db.commit()
    await db.refresh(user)

    return TokenResponse(access_token=_token_for(user, data.remember), user=UserResponse.model_validate(user))


@router.post("/resend-otp", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
async def resend_otp(request: Request, data: ResendOtpRequest, db: AsyncSession = Depends(get_db)):
    """Resend an email-verification OTP (no-op response even if email unknown)."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user and not user.email_verified:
        await otp_service.create_and_send_otp(
            db, email=user.email, purpose="email_verification",
            subject_type="user", subject_id=user.id,
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    result = await db.execute(
        select(User).where(User.email == data.email, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="email_not_verified")

    return TokenResponse(access_token=_token_for(user, data.remember), user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user (includes api_key for widget)."""
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile: first/last name, email (re-verify), password (needs current)."""
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name

    # Password change requires the current password
    if data.new_password:
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        user.password_hash = hash_password(data.new_password)

    email_changed = False
    if data.email and data.email != user.email:
        exists = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        user.email = data.email
        user.email_verified = False
        email_changed = True

    await db.commit()
    await db.refresh(user)

    if email_changed:
        # Reuse the email_verification flow so /auth/verify-email handles it.
        await otp_service.create_and_send_otp(
            db, email=user.email, purpose="email_verification",
            subject_type="user", subject_id=user.id,
        )

    return UserResponse.model_validate(user)
