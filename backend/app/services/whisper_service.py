"""Audio transcription via OpenAI Whisper (used for inbound WhatsApp voice notes)."""

from __future__ import annotations

import io
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


async def transcribe(audio: bytes, mime: str | None = None) -> str | None:
    """Transcribe audio bytes to text. Returns None if no OpenAI key or on error."""
    settings = get_settings()
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return None

    ext = "ogg"
    if mime:
        if "mp3" in mime or "mpeg" in mime:
            ext = "mp3"
        elif "wav" in mime:
            ext = "wav"
        elif "m4a" in mime or "mp4" in mime:
            ext = "m4a"

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        buf = io.BytesIO(audio)
        buf.name = f"audio.{ext}"
        result = await client.audio.transcriptions.create(model="whisper-1", file=buf)
        return (result.text or "").strip() or None
    except Exception as e:  # noqa: BLE001
        logger.error("Whisper transcription failed: %s", e)
        return None
