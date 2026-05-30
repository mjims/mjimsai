"""
SQLAlchemy models — all models imported here for Alembic auto-detection.
"""

from app.models.user import User  # noqa: F401
from app.models.admin_user import AdminUser  # noqa: F401
from app.models.otp_code import OtpCode  # noqa: F401
from app.models.plan import Plan  # noqa: F401
from app.models.llm_model import LLMModel  # noqa: F401
from app.models.payment_setting import PaymentSetting  # noqa: F401
from app.models.sebpay_country import SebpayCountry  # noqa: F401
from app.models.sebpay_operator import SebpayOperator  # noqa: F401
from app.models.agent import Agent  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk  # noqa: F401
from app.models.usage import UsageRecord  # noqa: F401
