"""
MILA Open — FastAPI application entry point.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from app.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    )
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT.value}")
    logger.info(f"SAAS mode: {settings.SAAS_MODE}")

    # Log available LLM providers
    from app.services.llm.factory import get_available_providers
    providers = get_available_providers()
    logger.info(f"Available LLM providers: {list(providers.keys())}")

    yield

    logger.info("Shutting down...")
    from app.database import engine
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Plateforme d'agents IA customisables — SaaS & self-hosted",
        docs_url="/docs" if settings.ENVIRONMENT.value != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT.value != "production" else None,
        lifespan=lifespan,
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Routes ---
    from app.api.v1.auth import router as auth_router
    from app.api.v1.agents import router as agents_router
    from app.api.v1.chat import router as chat_router
    from app.api.v1.conversations import router as conversations_router
    from app.api.v1.knowledge import router as knowledge_router

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(agents_router, prefix="/api/v1")
    app.include_router(chat_router, prefix="/api/v1")
    app.include_router(conversations_router, prefix="/api/v1")
    app.include_router(knowledge_router, prefix="/api/v1")

    # --- Health check ---
    @app.get("/health", tags=["System"])
    async def health():
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT.value,
        }

    # --- Widget JS serving ---
    WIDGET_PATH = Path(__file__).parent / "widget" / "widget.js"

    @app.get("/widget.js", tags=["Widget"])
    async def serve_widget():
        if not WIDGET_PATH.exists():
            return Response(content="// Widget not found", media_type="application/javascript")
        return FileResponse(
            WIDGET_PATH,
            media_type="application/javascript",
            headers={"Cache-Control": "public, max-age=3600"},
        )

    # --- Global exception handler ---
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()
