"""
MjimsAI — Seeding script: default Plan, demo User, and bootstrap backoffice Admin.

Usage:
    python -m app.scripts.seed
"""

import asyncio
import logging

from sqlalchemy.future import select

from app.config import get_settings
from app.core import generate_api_key, hash_password
from app.database import async_session_factory, engine
from app.models.admin_user import AdminUser
from app.models.plan import Plan
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mjimsai.seed")


async def seed_db():
    settings = get_settings()
    async with async_session_factory() as session:
        # Ensure a default "free" plan exists
        result = await session.execute(select(Plan).where(Plan.name == "free"))
        if result.scalars().first() is None:
            session.add(Plan(
                name="free",
                label="Gratuit",
                conversations_limit=100,
                features=["100 conversations/mois", "1 agent", "Support communautaire"],
                is_active=True,
                sort_order=0,
            ))
            logger.info("Created default 'free' plan.")

        # Bootstrap backoffice admin from env (if none exists)
        existing_admin = (await session.execute(select(AdminUser).limit(1))).scalars().first()
        if existing_admin is None and settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
            session.add(AdminUser(
                email=settings.ADMIN_EMAIL,
                first_name=settings.ADMIN_FIRST_NAME,
                last_name=settings.ADMIN_LAST_NAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                is_active=True,
            ))
            logger.info("Created bootstrap admin: %s", settings.ADMIN_EMAIL)
        elif existing_admin is None:
            logger.warning("No admin exists and ADMIN_EMAIL/ADMIN_PASSWORD not set — backoffice has no login.")

        # Create a demo user if none exists
        existing_user = (await session.execute(select(User).limit(1))).scalars().first()
        if existing_user is None:
            api_key = generate_api_key()
            session.add(User(
                email="demo@mjimsai.com",
                first_name="Demo",
                last_name="User",
                password_hash=hash_password("demo1234"),
                api_key=api_key,
                email_verified=True,
                is_active=True,
            ))
            logger.info("Created demo user: demo@mjimsai.com / demo1234")

        await session.commit()
        logger.info("Seed complete.")


async def main():
    try:
        await seed_db()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
