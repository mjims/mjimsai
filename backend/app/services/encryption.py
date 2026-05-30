"""Fernet symmetric encryption for per-agent LLM API keys."""

from __future__ import annotations

import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet | None:
    key = get_settings().ENCRYPTION_KEY
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except Exception:
        logger.error("Invalid ENCRYPTION_KEY — cannot encrypt/decrypt agent API keys")
        return None


def encrypt_api_key(plain_key: str) -> str:
    """Encrypt a plain API key with Fernet. Returns the encrypted token as a string."""
    fernet = _get_fernet()
    if not fernet:
        raise RuntimeError(
            "ENCRYPTION_KEY is not configured. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return fernet.encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt a Fernet-encrypted API key. Raises RuntimeError if key is missing or invalid."""
    fernet = _get_fernet()
    if not fernet:
        raise RuntimeError("ENCRYPTION_KEY is not configured — cannot decrypt agent API keys")
    try:
        return fernet.decrypt(encrypted.encode()).decode()
    except InvalidToken as exc:
        raise RuntimeError("Failed to decrypt agent API key — data may be corrupted") from exc


def mask_api_key(plain_key: str) -> str:
    """Return a masked representation for display: '...ab12'."""
    if len(plain_key) <= 4:
        return "***"
    return f"...{plain_key[-4:]}"
