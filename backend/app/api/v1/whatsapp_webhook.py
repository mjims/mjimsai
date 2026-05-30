"""WhatsApp Cloud API webhook — Meta verification (GET) + inbound messages (POST).

No auth: the GET handshake checks the verify_token, the POST is validated by the
X-Hub-Signature-256 HMAC (app secret). Inbound handling runs in the background so
we can ACK Meta within its short timeout.
"""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, Response, status
from sqlalchemy.future import select

import base64

from app.database import async_session_factory
from app.models.agent import Agent
from app.models.conversation import Conversation
from app.services import chat_service, whatsapp_service, whisper_service
from app.services.whatsapp_service import InboundMsg

# Providers that can consume inbound images (vision).
_VISION_PROVIDERS = {"anthropic", "openai", "gemini"}

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WhatsApp Webhook"])

_LIMIT_MSG = "Désolé, la limite de conversations de ce service est atteinte. Réessayez plus tard."
_MEDIA_FALLBACK = "Désolé, je ne peux pas encore traiter ce type de message. Envoyez-moi du texte."
_VOICE_FALLBACK = "Les messages vocaux ne sont pas inclus dans cette offre. Envoyez-moi du texte."


@router.get("/webhooks/whatsapp/{agent_id}")
async def whatsapp_verify(
    agent_id: uuid.UUID,
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
):
    """Meta subscription handshake."""
    async with async_session_factory() as db:
        config = await whatsapp_service.get_config(db, agent_id)
    if config and hub_mode == "subscribe" and hub_verify_token == config.verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


@router.post("/webhooks/whatsapp/{agent_id}")
async def whatsapp_inbound(agent_id: uuid.UUID, request: Request, background: BackgroundTasks):
    raw_body = await request.body()

    async with async_session_factory() as db:
        config = await whatsapp_service.get_config(db, agent_id)
        creds = await whatsapp_service.get_creds(db, config) if config else None

    # Fail closed on signature.
    if not creds or not creds.app_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WhatsApp not configured")
    sig = request.headers.get("X-Hub-Signature-256")
    if not whatsapp_service.verify_signature(creds.app_secret, raw_body, sig):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    messages = whatsapp_service.parse_inbound(payload)
    if messages:
        background.add_task(_process_messages, str(agent_id), messages)

    return {"received": True}


async def _latest_conversation_id(db, agent_id: uuid.UUID, wa_id: str) -> uuid.UUID | None:
    row = (await db.execute(
        select(Conversation.id)
        .where(Conversation.agent_id == agent_id, Conversation.visitor_id == wa_id)
        .order_by(Conversation.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()
    return row


async def _resolve_content(
    msg: InboundMsg, creds, provider_name: str, voice_ok: bool
) -> tuple[str | None, list[str]]:
    """Resolve an inbound message into (text, images) ready for the LLM."""
    if msg.type == "text":
        return msg.text, []

    if msg.type == "image" and msg.media_id:
        if provider_name not in _VISION_PROVIDERS:
            return (msg.text or "[image reçue]"), []
        media = await whatsapp_service.get_media(msg.media_id, creds.access_token)
        if not media:
            return None, []
        data, mime = media
        data_url = f"data:{mime};base64,{base64.b64encode(data).decode()}"
        return (msg.text or "Décris/analyse cette image."), [data_url]

    if msg.type in ("audio", "voice") and msg.media_id:
        if not voice_ok:
            return None, []  # caller sends the voice fallback
        media = await whatsapp_service.get_media(msg.media_id, creds.access_token)
        if not media:
            return None, []
        data, mime = media
        text = await whisper_service.transcribe(data, mime)
        return text, []

    # document, sticker, location, video, ...
    return None, []


async def _process_messages(agent_id_str: str, messages: list[InboundMsg]) -> None:
    agent_id = uuid.UUID(agent_id_str)
    async with async_session_factory() as db:
        agent = (await db.execute(select(Agent).where(Agent.id == agent_id))).scalar_one_or_none()
        if not agent:
            return
        config = await whatsapp_service.get_config(db, agent_id)
        creds = await whatsapp_service.get_creds(db, config) if config else None
        if not creds or not creds.is_enabled or not creds.phone_number_id or not creds.access_token:
            return
        if not await whatsapp_service.is_whatsapp_allowed(db, agent):
            return
        voice_ok = await whatsapp_service.is_voice_allowed(db, agent)

        for msg in messages:
            text, images = await _resolve_content(msg, creds, agent.llm_provider, voice_ok)
            if not text and not images:
                fallback = _VOICE_FALLBACK if (msg.type in ("audio", "voice") and not voice_ok) else _MEDIA_FALLBACK
                await whatsapp_service.send_text(creds.phone_number_id, creds.access_token, msg.from_wa_id, fallback)
                continue

            try:
                conv_id = await _latest_conversation_id(db, agent_id, msg.from_wa_id)
                conversation = await chat_service.get_or_create_conversation(
                    db, agent, visitor_id=msg.from_wa_id, conversation_id=conv_id,
                    metadata={"channel": "whatsapp"},
                )
            except HTTPException as e:
                if e.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                    await whatsapp_service.send_text(creds.phone_number_id, creds.access_token, msg.from_wa_id, _LIMIT_MSG)
                continue

            try:
                response = await chat_service.process_chat_message(
                    db, agent, conversation, text or "", images=images or None,
                )
                await db.commit()
            except Exception as e:  # noqa: BLE001
                logger.error("WhatsApp processing error for agent %s: %s", agent_id, e)
                await db.rollback()
                continue

            await whatsapp_service.send_text(creds.phone_number_id, creds.access_token, msg.from_wa_id, response.content)
