"""Anthropic (Claude) LLM provider."""

from __future__ import annotations

import logging
from typing import AsyncIterator

import anthropic

from app.services.llm.base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)


class AnthropicProvider(BaseLLMProvider):
    provider_name = "anthropic"

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> LLMResponse:
        # Separate system prompt from messages
        api_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        response = await self.client.messages.create(
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            system=config.system_prompt or "",
            messages=api_messages,
        )

        content = ""
        for block in response.content:
            if block.type == "text":
                content += block.text

        return LLMResponse(
            content=content,
            tokens_input=response.usage.input_tokens,
            tokens_output=response.usage.output_tokens,
            model=response.model,
            finish_reason=response.stop_reason or "",
        )

    async def stream_chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> AsyncIterator[str]:
        api_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        ]

        async with self.client.messages.stream(
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            system=config.system_prompt or "",
            messages=api_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
