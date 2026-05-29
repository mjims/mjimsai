"""
SQLAlchemy models — all models are imported here for Alembic auto-detection.
"""

from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.agent import Agent  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk  # noqa: F401
