"""Pytest fixtures: isolated postgres test DB, ASGI client, OTP capture.

Runs against the same postgres server as the app but on a dedicated database
(``<db>_test``), created on the fly. The app's ``get_db`` dependency is
overridden to use a per-test engine/session, and tables are truncated between
tests for isolation.
"""

import asyncio
import os

# Force a non-production environment BEFORE importing the app, so the
# production fail-fast guard does not abort import and OTPs are not required to
# be emailed over real SMTP.
os.environ["ENVIRONMENT"] = "development"
os.environ["TRUSTED_PROXIES"] = ""

import asyncpg  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

import app.models  # noqa: E402,F401  (register all tables on Base.metadata)
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.ratelimit import limiter  # noqa: E402

# Disable rate limiting during tests (we assert business logic, not throttling).
limiter.enabled = False

_SETTINGS = get_settings()
_BASE_URL = _SETTINGS.DATABASE_URL  # postgresql+asyncpg://user:pwd@host:port/dbname
_TEST_DB = _BASE_URL.rsplit("/", 1)[1] + "_test"
_TEST_URL = _BASE_URL.rsplit("/", 1)[0] + "/" + _TEST_DB
_MAINT_DSN = _BASE_URL.replace("+asyncpg", "").rsplit("/", 1)[0] + "/" + _BASE_URL.rsplit("/", 1)[1]


async def _bootstrap_test_db() -> None:
    # Create the test database if missing (connect to the app DB as maintenance).
    conn = await asyncpg.connect(dsn=_MAINT_DSN)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", _TEST_DB)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{_TEST_DB}"')
    finally:
        await conn.close()

    # Create schema from the models.
    engine = create_async_engine(_TEST_URL)
    async with engine.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    await engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    asyncio.run(_bootstrap_test_db())
    yield


@pytest_asyncio.fixture
async def client():
    """A fresh DB (truncated) + ASGI client per test."""
    engine = create_async_engine(_TEST_URL)
    TestSession = async_sessionmaker(engine, expire_on_commit=False)

    # Truncate all tables for isolation.
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())

    async def _override_get_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
def otp_sink(monkeypatch):
    """Capture OTP codes that would be emailed. Returns {email: last_code}."""
    store: dict[str, str] = {}

    async def _capture(to: str, code: str, purpose: str):
        store[to] = code

    # otp_service imported send_otp_email into its namespace.
    monkeypatch.setattr("app.services.otp_service.send_otp_email", _capture)
    return store


@pytest_asyncio.fixture
async def make_admin(client):
    """Factory to insert an active admin (with password) into the test DB."""
    from app.core import hash_password
    from app.models.admin_user import AdminUser

    engine = create_async_engine(_TEST_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def _make(email="root@admin.test", password="adminpass1", first_name="Root", last_name="Admin"):
        async with Session() as s:
            admin = AdminUser(
                email=email, first_name=first_name, last_name=last_name,
                password_hash=hash_password(password), is_active=True,
            )
            s.add(admin)
            await s.commit()
        return {"email": email, "password": password}

    yield _make
    await engine.dispose()


@pytest.fixture
def invite_sink(monkeypatch):
    """Capture admin invite links. Returns {email: link}."""
    store: dict[str, str] = {}

    async def _capture(to: str, link: str, inviter_name: str):
        store[to] = link

    monkeypatch.setattr("app.api.v1.admin.send_admin_invite_email", _capture)
    return store
