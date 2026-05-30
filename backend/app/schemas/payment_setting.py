"""Schemas for admin-managed payment provider settings."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PaymentSettingResponse(BaseModel):
    """Admin view — secrets are masked, never returned in clear."""
    provider: str
    is_enabled: bool
    base_url: Optional[str] = None
    environment: Optional[str] = None
    # Masked previews ("...ab12") or None if unset
    secret_key_masked: Optional[str] = None
    public_key_masked: Optional[str] = None
    webhook_secret_masked: Optional[str] = None
    # Whether each secret is configured (DB or env)
    secret_key_set: bool = False
    public_key_set: bool = False
    webhook_secret_set: bool = False


class PaymentSettingUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    base_url: Optional[str] = None
    environment: Optional[str] = None
    # Write-only: a non-empty value replaces (and is encrypted); empty/None = unchanged
    secret_key: Optional[str] = None
    public_key: Optional[str] = None
    webhook_secret: Optional[str] = None
