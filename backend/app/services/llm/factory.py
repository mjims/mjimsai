"""
LLM Provider Factory — instantiate the correct provider based on agent config.
"""

from __future__ import annotations

import logging
from functools import lru_cache
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


# Cache provider instances per (provider_name, api_key) to reuse HTTP connections
_provider_cache: dict[str, BaseLLMProvider] = {}


def get_llm_provider(provider_name: str) -> BaseLLMProvider:
    """
    Get an LLM provider instance by name.
    
    Raises ValueError if the provider is not supported or the API key is missing.
    """
    _register_providers()
    settings = get_settings()

    # Map provider name to API key environment variable
    api_key_map = {
        "anthropic": settings.ANTHROPIC_API_KEY,
        "openai": settings.OPENAI_API_KEY,
        "gemini": settings.GOOGLE_API_KEY,
        "grok": settings.XAI_API_KEY,
    }

    if provider_name not in _PROVIDER_CLASSES:
        raise ValueError(
            f"Unsupported LLM provider: '{provider_name}'. "
            f"Supported: {list(_PROVIDER_CLASSES.keys())}"
        )

    api_key = api_key_map.get(provider_name)
    if not api_key:
        raise ValueError(
            f"API key not configured for provider '{provider_name}'. "
            f"Set the corresponding environment variable."
        )

    # Cache by provider name (key is already in settings)
    if provider_name not in _provider_cache:
        provider_class = _PROVIDER_CLASSES[provider_name]
        _provider_cache[provider_name] = provider_class(api_key=api_key)
        logger.info(f"Initialized LLM provider: {provider_name}")

    return _provider_cache[provider_name]


def get_available_providers() -> dict[str, list[str]]:
    """Return available providers and their models (only those with configured API keys)."""
    _register_providers()
    settings = get_settings()

    api_key_map = {
        "anthropic": settings.ANTHROPIC_API_KEY,
        "openai": settings.OPENAI_API_KEY,
        "gemini": settings.GOOGLE_API_KEY,
        "grok": settings.XAI_API_KEY,
    }

    result = {}
    for name, cls in _PROVIDER_CLASSES.items():
        if api_key_map.get(name):
            # Instantiate temporarily just to get model list
            try:
                provider = get_llm_provider(name)
                result[name] = provider.list_models()
            except Exception:
                logger.warning(f"Failed to initialize provider {name}")
    return result
