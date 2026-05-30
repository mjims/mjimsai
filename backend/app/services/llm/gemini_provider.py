"""Google Gemini LLM provider."""

from __future__ import annotations

import base64
import logging
from typing import AsyncIterator

from google import genai
from google.genai import types

from app.services.llm.base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    provider_name = "gemini"

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    async def chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> LLMResponse:
        contents = []
        for m in messages:
            if m.role == "system":
                continue
            role = "user" if m.role == "user" else "model"
            parts = [types.Part(text=m.content)]
            for img in getattr(m, "images", []):
                try:
                    header, b64 = img.split(",", 1)
                    mime = header.split(":", 1)[1].split(";", 1)[0]
                    parts.append(types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime))
                except (ValueError, IndexError):
                    continue
            contents.append(types.Content(role=role, parts=parts))

        generation_config = types.GenerateContentConfig(
            temperature=config.temperature,
            max_output_tokens=config.max_tokens,
            system_instruction=config.system_prompt or None,
        )

        response = await self.client.aio.models.generate_content(
            model=config.model,
            contents=contents,
            config=generation_config,
        )

        content = response.text or ""
        tokens_input = 0
        tokens_output = 0
        if response.usage_metadata:
            tokens_input = response.usage_metadata.prompt_token_count or 0
            tokens_output = response.usage_metadata.candidates_token_count or 0

        return LLMResponse(
            content=content,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            model=config.model,
            finish_reason="stop",
        )

    async def stream_chat(
        self,
        messages: list[LLMMessage],
        config: LLMConfig,
    ) -> AsyncIterator[str]:
        contents = []
        for m in messages:
            if m.role == "system":
                continue
            role = "user" if m.role == "user" else "model"
            parts = [types.Part(text=m.content)]
            for img in getattr(m, "images", []):
                try:
                    header, b64 = img.split(",", 1)
                    mime = header.split(":", 1)[1].split(";", 1)[0]
                    parts.append(types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime))
                except (ValueError, IndexError):
                    continue
            contents.append(types.Content(role=role, parts=parts))

        generation_config = types.GenerateContentConfig(
            temperature=config.temperature,
            max_output_tokens=config.max_tokens,
            system_instruction=config.system_prompt or None,
        )

        async for chunk in await self.client.aio.models.generate_content_stream(
            model=config.model,
            contents=contents,
            config=generation_config,
        ):
            if chunk.text:
                yield chunk.text
