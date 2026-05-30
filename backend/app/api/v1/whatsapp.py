"""Per-agent WhatsApp channel configuration (user-owned)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.whatsapp_config import WhatsAppConfig
from app.schemas.whatsapp import WhatsAppConfigResponse, WhatsAppConfigUpdate
from app.services import agent_service, whatsapp_service
from app.services.encryption import encrypt_api_key, mask_api_key

router = APIRouter(prefix="/agents", tags=["WhatsApp"])


async def _response(db: AsyncSession, agent_id: uuid.UUID, config: WhatsAppConfig, allowed: bool) -> WhatsAppConfigResponse:
    creds = await whatsapp_service.get_creds(db, config)
    return WhatsAppConfigResponse(
        allowed=allowed,
        is_enabled=config.is_enabled,
        phone_number_id=config.phone_number_id,
        display_phone_number=config.display_phone_number,
        verify_token=config.verify_token,
        webhook_path=f"/webhooks/whatsapp/{agent_id}",
        access_token_masked=mask_api_key(creds.access_token) if creds.access_token else None,
        app_secret_masked=mask_api_key(creds.app_secret) if creds.app_secret else None,
        access_token_set=bool(creds.access_token),
        app_secret_set=bool(creds.app_secret),
    )


async def _get_or_create_config(db: AsyncSession, agent_id: uuid.UUID) -> WhatsAppConfig:
    config = await whatsapp_service.get_config(db, agent_id)
    if not config:
        config = WhatsAppConfig(agent_id=agent_id, verify_token=whatsapp_service.generate_verify_token())
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@router.get("/{agent_id}/whatsapp", response_model=WhatsAppConfigResponse)
async def get_whatsapp_config(
    agent_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent_by_id(db, user.id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    allowed = await whatsapp_service.is_whatsapp_allowed(db, agent)
    config = await _get_or_create_config(db, agent_id)
    return await _response(db, agent_id, config, allowed)


@router.put("/{agent_id}/whatsapp", response_model=WhatsAppConfigResponse)
async def update_whatsapp_config(
    agent_id: uuid.UUID,
    data: WhatsAppConfigUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent_by_id(db, user.id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    allowed = await whatsapp_service.is_whatsapp_allowed(db, agent)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="WhatsApp is not included in this agent's plan")

    config = await _get_or_create_config(db, agent_id)

    if data.is_enabled is not None:
        config.is_enabled = data.is_enabled
    if data.phone_number_id is not None:
        config.phone_number_id = data.phone_number_id or None
    if data.display_phone_number is not None:
        config.display_phone_number = data.display_phone_number or None
    if data.access_token:
        config.access_token_enc = encrypt_api_key(data.access_token)
    if data.app_secret:
        config.app_secret_enc = encrypt_api_key(data.app_secret)

    await db.commit()
    await db.refresh(config)
    return await _response(db, agent_id, config, allowed)
