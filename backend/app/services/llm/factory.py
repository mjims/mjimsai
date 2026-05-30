"""
LLM Provider Factory — instantiate the correct provider based on agent config.

Supports two modes:
- Platform key: uses env-var API keys (cached per provider)
- Agent key: uses user-provided API key (not cached, per-request)
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.llm_model import LLMModel
from app.services.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)

# Provider registry
_PROVIDER_CLASSES: dict[str, type] = {}


def _register_providers():
    """Lazily register provider classes to avoid import errors when a SDK is not installed."""
    global _PROVIDER_CLASSES
    if _PROVIDER_CLASSES:
        return

    from app.services.llm.anthropic_provider import AnthropicProvider
    from app.services.llm.openai_provider import OpenAIProvider
    from app.services.llm.gemini_provider import GeminiProvider
    from app.services.llm.grok_provider import GrokProvider
    from app.services.llm.deepseek_provider import DeepSeekProvider

    _PROVIDER_CLASSES = {
        "anthropic": AnthropicProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
        "grok": GrokProvider,
        "deepseek": DeepSeekProvider,
    }


def _platform_key_map() -> dict[str, Optional[str]]:
    """Map each provider to its platform-level (env-var) API key."""
    settings = get_settings()
    return {
        "anthropic": settings.ANTHROPIC_API_KEY,
        "openai": settings.OPENAI_API_KEY,
        "gemini": settings.GOOGLE_API_KEY,
        "grok": settings.XAI_API_KEY,
        "deepseek": settings.DEEPSEEK_API_KEY,
    }


def get_supported_providers() -> list[str]:
    """Return the code-backed provider slugs (those with an SDK integration)."""
    _register_providers()
    return list(_PROVIDER_CLASSES.keys())


# Cache platform-key provider instances (env-var keys only)
_platform_provider_cache: dict[str, BaseLLMProvider] = {}


def get_llm_provider(
    provider_name: str,
    api_key: Optional[str] = None,
) -> BaseLLMProvider:
    """
    Get an LLM provider instance.

    - If api_key is provided (agent-owned key), creates a fresh instance (not cached).
    - If api_key is None, uses the platform env-var key with instance caching.

    Raises ValueError if the provider is not supported or no API key is available.
    """
    _register_providers()

    if provider_name not in _PROVIDER_CLASSES:
        raise ValueError(
            f"Unsupported LLM provider: '{provider_name}'. "
            f"Supported: {list(_PROVIDER_CLASSES.keys())}"
        )

    provider_class = _PROVIDER_CLASSES[provider_name]

    # Agent-owned key: always create a fresh instance
    if api_key:
        return provider_class(api_key=api_key)

    # Platform key: use env var with caching
    platform_key = _platform_key_map().get(provider_name)
    if not platform_key:
        raise ValueError(
            f"No API key available for provider '{provider_name}'. "
            "Configure the environment variable or set a per-agent API key."
        )

    if provider_name not in _platform_provider_cache:
        _platform_provider_cache[provider_name] = provider_class(api_key=platform_key)
        logger.info(f"Initialized platform LLM provider: {provider_name}")

    return _platform_provider_cache[provider_name]


async def get_available_models(db: AsyncSession) -> dict[str, list[str]]:
    """Return active models grouped by provider, sourced from the database.

    Only providers that have a code-backed integration are included. Models are
    admin-managed (CRUD in the backoffice), so this reflects the current catalog
    without any code change.
    """
    _register_providers()

    result = await db.execute(
        select(LLMModel)
        .where(LLMModel.is_active.is_(True))
        .order_by(LLMModel.provider, LLMModel.sort_order, LLMModel.model_id)
    )
    models = result.scalars().all()

    providers: dict[str, list[str]] = {}
    for m in models:
        if m.provider not in _PROVIDER_CLASSES:
            # Skip models whose provider has no SDK integration
            continue
        providers.setdefault(m.provider, []).append(m.model_id)
    return providers
