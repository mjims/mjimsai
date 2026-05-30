"""Schemas for per-agent WhatsApp channel configuration."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class WhatsAppConfigResponse(BaseModel):
    """User view — secrets masked, never returned in clear."""
    allowed: bool                 # plan grants the WhatsApp capability
    is_enabled: bool
    phone_number_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    verify_token: str
    webhook_path: str             # /webhooks/whatsapp/{agent_id}
    access_token_masked: Optional[str] = None
    app_secret_masked: Optional[str] = None
    access_token_set: bool = False
    app_secret_set: bool = False


class WhatsAppConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    phone_number_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    # Write-only: non-empty value is encrypted & replaces; empty/None = unchanged
    access_token: Optional[str] = None
    app_secret: Optional[str] = None
