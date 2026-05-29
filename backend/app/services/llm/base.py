"""Abstract base class for all LLM providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class LLMMessage:
    role: str  # "user", "assistant", "system"
    content: str


@dataclass
class LLMResponse:
    content: str
    tokens_input: int = 0
    tokens_output: int = 0
    model: str = ""
    finish_reason: str = ""


@dataclass
class LLMConfig:
    model: str = ""
    temperature: float = 0.7
    max_tokens: int = 2048
    system_prompt: str = ""
    extra: dict = field(default_factory=dict)


class BaseLLMProvider(ABC):
    """Abstract interface for LLM providers."""

    provider_name: str = "base"

    @abstractmethod
    async def chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> LLMResponse:
        """Send a chat completion request and return the full response."""
        ...

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> AsyncIterator[str]:
        """Stream a chat completion response, yielding text chunks."""
        ...

    @abstractmethod
    def list_models(self) -> list[str]:
        """Return available models for this provider."""
        ...
