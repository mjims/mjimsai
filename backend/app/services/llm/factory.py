"""
LLM Provider Factory — instantiate the correct provider based on agent config.

Supports two modes:
- Platform key: uses env-var API keys (cached per provider)
- Agent key: uses user-provided API key (not cached, per-request)
"""

from __future__ import annotations

import logging
from typing import Optional

from app.config import get_settings
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

    _PROVIDER_CLASSES = {
        "anthropic": AnthropicProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
        "grok": GrokProvider,
    }


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
    settings = get_settings()

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
    platform_key_map = {
        "anthropic": settings.ANTHROPIC_API_KEY,
        "openai": settings.OPENAI_API_KEY,
        "gemini": settings.GOOGLE_API_KEY,
        "grok": settings.XAI_API_KEY,
    }
    platform_key = platform_key_map.get(provider_name)
    if not platform_key:
        raise ValueError(
            f"No API key available for provider '{provider_name}'. "
            "Configure the environment variable or set a per-agent API key."
        )

    if provider_name not in _platform_provider_cache:
        _platform_provider_cache[provider_name] = provider_class(api_key=platform_key)
        logger.info(f"Initialized platform LLM provider: {provider_name}")

    return _platform_provider_cache[provider_name]


def get_available_providers() -> dict[str, list[str]]:
    """Return available providers and their models (only those with configured platform API keys)."""
    _register_providers()
    settings = get_settings()

    platform_key_map = {
        "anthropic": settings.ANTHROPIC_API_KEY,
        "openai": settings.OPENAI_API_KEY,
        "gemini": settings.GOOGLE_API_KEY,
        "grok": settings.XAI_API_KEY,
    }

    result = {}
    for name, cls in _PROVIDER_CLASSES.items():
        try:
            if platform_key_map.get(name):
                provider = get_llm_provider(name)
            else:
                # Include provider in list even without platform key (user may set agent key)
                provider = cls(api_key="dummy")
            result[name] = provider.list_models()
        except Exception:
            logger.warning(f"Failed to get models for provider {name}")
    return result
