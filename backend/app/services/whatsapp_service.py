"""WhatsApp Cloud API (Meta) helpers: signature, send, media, payload parsing."""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import uuid
from dataclasses import dataclass

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import get_settings
from app.models.agent import Agent
from app.models.plan import Plan
from app.models.whatsapp_config import WhatsAppConfig
from app.services.encryption import decrypt_api_key

logger = logging.getLogger(__name__)


@dataclass
class InboundMsg:
    from_wa_id: str
    wa_message_id: str
    type: str  # text | image | audio | voice | document | ...
    text: str | None = None
    media_id: str | None = None
    mime: str | None = None


@dataclass
class WhatsAppCreds:
    is_enabled: bool
    phone_number_id: str | None
    access_token: str | None
    app_secret: str | None
    verify_token: str


def _graph_base() -> str:
    return f"https://graph.facebook.com/{get_settings().WHATSAPP_GRAPH_VERSION}"


def generate_verify_token() -> str:
    return secrets.token_urlsafe(24)


def verify_signature(app_secret: str, raw_body: bytes, header: str | None) -> bool:
    """Validate Meta's X-Hub-Signature-256 ('sha256=<hex>')."""
    if not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header.split("=", 1)[1])


def _dec(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return decrypt_api_key(value)
    except Exception:
        return None


async def get_creds(db: AsyncSession, config: WhatsAppConfig) -> WhatsAppCreds:
    return WhatsAppCreds(
        is_enabled=config.is_enabled,
        phone_number_id=config.phone_number_id,
        access_token=_dec(config.access_token_enc),
        app_secret=_dec(config.app_secret_enc),
        verify_token=config.verify_token,
    )


async def get_config(db: AsyncSession, agent_id: uuid.UUID) -> WhatsAppConfig | None:
    return (await db.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.agent_id == agent_id)
    )).scalar_one_or_none()


async def is_whatsapp_allowed(db: AsyncSession, agent: Agent) -> bool:
    """The agent's plan must grant the WhatsApp capability."""
    if not agent.plan_id:
        return False
    plan = (await db.execute(select(Plan).where(Plan.id == agent.plan_id))).scalar_one_or_none()
    return bool(plan and plan.whatsapp_enabled)


async def is_voice_allowed(db: AsyncSession, agent: Agent) -> bool:
    """The agent's plan must grant the voice (audio transcription) capability."""
    if not agent.plan_id:
        return False
    plan = (await db.execute(select(Plan).where(Plan.id == agent.plan_id))).scalar_one_or_none()
    return bool(plan and plan.voice_enabled)


def parse_inbound(payload: dict) -> list[InboundMsg]:
    """Extract user messages from a Meta webhook payload (ignores statuses)."""
    out: list[InboundMsg] = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for m in value.get("messages", []):
                mtype = m.get("type", "")
                msg = InboundMsg(
                    from_wa_id=m.get("from", ""),
                    wa_message_id=m.get("id", ""),
                    type=mtype,
                )
                if mtype == "text":
                    msg.text = (m.get("text") or {}).get("body")
                elif mtype in ("image", "audio", "voice", "video", "document", "sticker"):
                    media = m.get(mtype) or {}
                    msg.media_id = media.get("id")
                    msg.mime = media.get("mime_type")
                    msg.text = media.get("caption")
                if msg.from_wa_id:
                    out.append(msg)
    return out


async def send_text(phone_number_id: str, access_token: str, to: str, body: str) -> None:
    """Send a plain text WhatsApp message via the Graph API."""
    url = f"{_graph_base()}/{phone_number_id}/messages"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to,
                    "type": "text",
                    "text": {"preview_url": False, "body": body[:4096]},
                },
                timeout=30.0,
            )
            resp.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("WhatsApp send_text failed: %s", e)


async def get_media(media_id: str, access_token: str) -> tuple[bytes, str] | None:
    """Resolve a media id to its bytes + mime type."""
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        async with httpx.AsyncClient() as client:
            meta = await client.get(f"{_graph_base()}/{media_id}", headers=headers, timeout=20.0)
            meta.raise_for_status()
            info = meta.json()
            media_url = info.get("url")
            mime = info.get("mime_type", "application/octet-stream")
            if not media_url:
                return None
            blob = await client.get(media_url, headers=headers, timeout=30.0)
            blob.raise_for_status()
            return blob.content, mime
    except httpx.HTTPError as e:
        logger.error("WhatsApp get_media failed: %s", e)
        return None
