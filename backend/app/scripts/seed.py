"""
MILA Open — Seeding script to initialize a default Organization and User.
Usage:
    python -m app.scripts.seed
"""

import asyncio
import logging
from sqlalchemy.future import select

from app.config import get_settings
from app.database import async_session_maker, engine
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.core import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mila.seed")

async def seed_db():
    settings = get_settings()
    async with async_session_maker() as session:
        # Check if organization already exists
        result = await session.execute(select(Organization).limit(1))
        existing_org = result.scalars().first()

        if existing_org:
            logger.info("Database already seeded. Skipping initialization.")
            return

        logger.info("Seeding database with default organization and administrator...")

        # Create default organization
        org = Organization(
            name="Default Organization",
            slug="default",
            description="Created automatically on system setup",
            plan="enterprise",
            is_active=True,
        )
        session.add(org)
        await session.flush()  # to populate org.id and org.api_key

        # Create admin user
        admin = User(
            organization_id=org.id,
            email="admin@mila.open",
            username="admin",
            hashed_password=get_password_hash("admin1234"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin)

        await session.commit()
        
        logger.info("==================================================")
        logger.info("MILA Open Initialized Successfully!")
        logger.info(f"Organization slug: {org.slug}")
        logger.info(f"Organization API Key: {org.api_key}")
        logger.info("Admin Credentials:")
        logger.info("  Email:    admin@mila.open")
        logger.info("  Password: admin1234")
        logger.info("==================================================")

async def main():
    try:
        await seed_db()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
