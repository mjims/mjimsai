"""Anthropic (Claude) LLM provider."""

from __future__ import annotations

import logging
from typing import AsyncIterator

import anthropic

from app.services.llm.base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)


def _temperature_rejected(err: Exception) -> bool:
    """Some newer Claude models reject the `temperature` parameter."""
    return "temperature" in str(err).lower()


class AnthropicProvider(BaseLLMProvider):
    provider_name = "anthropic"

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    def _build_kwargs(self, config: LLMConfig, api_messages: list[dict]) -> dict:
        return {
            "model": config.model,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "system": config.system_prompt or "",
            "messages": api_messages,
        }

    @staticmethod
    def _content(m: LLMMessage):
        if not m.images:
            return m.content
        blocks: list[dict] = []
        for img in m.images:
            # img is a data URL: data:<mime>;base64,<data>
            try:
                header, b64 = img.split(",", 1)
                media_type = header.split(":", 1)[1].split(";", 1)[0]
            except (ValueError, IndexError):
                continue
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}})
        blocks.append({"type": "text", "text": m.content or ""})
        return blocks

    async def chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> LLMResponse:
        # Separate system prompt from messages
        api_messages = [
            {"role": m.role, "content": self._content(m)}
            for m in messages
            if m.role != "system"
        ]

        kwargs = self._build_kwargs(config, api_messages)
        try:
            response = await self.client.messages.create(**kwargs)
        except anthropic.BadRequestError as e:
            if "temperature" in kwargs and _temperature_rejected(e):
                logger.info("Model %s rejects `temperature`; retrying without it.", config.model)
                kwargs.pop("temperature", None)
                response = await self.client.messages.create(**kwargs)
            else:
                raise

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

        kwargs = self._build_kwargs(config, api_messages)
        try:
            async with self.client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text
        except anthropic.BadRequestError as e:
            if "temperature" in kwargs and _temperature_rejected(e):
                logger.info("Model %s rejects `temperature`; retrying without it.", config.model)
                kwargs.pop("temperature", None)
                async with self.client.messages.stream(**kwargs) as stream:
                    async for text in stream.text_stream:
                        yield text
            else:
                raise
