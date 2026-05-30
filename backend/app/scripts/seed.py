"""
MjimsAI — Seeding script to initialize a default Plan and demo User.

Usage:
    python -m app.scripts.seed
"""

import asyncio
import logging

from sqlalchemy.future import select

from app.core import generate_api_key, hash_password
from app.database import async_session_factory, engine
from app.models.plan import Plan
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mjimsai.seed")


async def seed_db():
    async with async_session_factory() as session:
        # Ensure a default "free" plan exists
        result = await session.execute(select(Plan).where(Plan.name == "free"))
        free_plan = result.scalars().first()
        if free_plan is None:
            free_plan = Plan(
                name="free",
                label="Gratuit",
                conversations_limit=100,
                features=["100 conversations/mois", "1 agent", "Support communautaire"],
                is_active=True,
                sort_order=0,
            )
            session.add(free_plan)
            logger.info("Created default 'free' plan.")

        # Create a demo user if none exists
        result = await session.execute(select(User).limit(1))
        existing_user = result.scalars().first()
        if existing_user:
            logger.info("A user already exists. Skipping demo user creation.")
            await session.commit()
            return

        api_key = generate_api_key()
        demo = User(
            email="admin@mjimsai.com",
            username="admin",
            full_name="Administrator",
            password_hash=hash_password("admin1234"),
            api_key=api_key,
            is_active=True,
        )
        session.add(demo)
        await session.commit()

        logger.info("==================================================")
        logger.info("MjimsAI Initialized Successfully!")
        logger.info("Demo Credentials:")
        logger.info("  Email:    admin@mjimsai.com")
        logger.info("  Password: admin1234")
        logger.info(f"  API Key:  {api_key}")
        logger.info("==================================================")


async def main():
    try:
        await seed_db()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
