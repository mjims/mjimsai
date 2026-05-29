"""Grok (xAI) LLM provider — uses OpenAI-compatible API."""

from __future__ import annotations

import logging
from typing import AsyncIterator

from openai import AsyncOpenAI

from app.services.llm.base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)


class GrokProvider(BaseLLMProvider):
    """xAI Grok provider — uses OpenAI-compatible endpoint."""

    provider_name = "grok"

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.x.ai/v1",
        )

    async def chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> LLMResponse:
        api_messages = []
        if config.system_prompt:
            api_messages.append({"role": "system", "content": config.system_prompt})
        api_messages.extend(
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        )

        response = await self.client.chat.completions.create(
            model=config.model,
            messages=api_messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
        )

        choice = response.choices[0]
        return LLMResponse(
            content=choice.message.content or "",
            tokens_input=response.usage.prompt_tokens if response.usage else 0,
            tokens_output=response.usage.completion_tokens if response.usage else 0,
            model=response.model,
            finish_reason=choice.finish_reason or "",
        )

    async def stream_chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> AsyncIterator[str]:
        api_messages = []
        if config.system_prompt:
            api_messages.append({"role": "system", "content": config.system_prompt})
        api_messages.extend(
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        )

        stream = await self.client.chat.completions.create(
            model=config.model,
            messages=api_messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def list_models(self) -> list[str]:
        return [
            "grok-3",
            "grok-3-mini",
            "grok-2",
        ]
