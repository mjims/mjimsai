"""Pydantic schemas for billing routes."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.plan import PlanResponse


class AgentSubscriptionResponse(BaseModel):
    agent_id: uuid.UUID
    plan: Optional[PlanResponse]
    billing_period: str
    subscription_expires_at: Optional[datetime]
    stripe_subscription_id: Optional[str]
    sebpay_subscription_ref: Optional[str]
    # Usage this month
    conversations_this_month: int
    conversations_limit: int  # from plan, -1 = unlimited
    usage_percent: Optional[float]


class UsageResponse(BaseModel):
    year_month: str
    conversations_count: int
    messages_count: int
    tokens_input_total: int
    tokens_output_total: int
    plan_limit: int
    usage_percent: Optional[float]


class StripeSubscribeRequest(BaseModel):
    plan_id: uuid.UUID
    billing_period: str = "monthly"
    success_url: str
    cancel_url: str


class StripeCheckoutResponse(BaseModel):
    url: str


class SebpaySubscribeRequest(BaseModel):
    plan_id: uuid.UUID
    billing_period: str = "monthly"
    phone: str   # international format WITHOUT + (e.g. "22997000000")
    operator: str  # mtn | moov | orange | wav
    country: str = "BJ"
    callback_url: Optional[str] = None


class SebpayCheckoutResponse(BaseModel):
    transaction_id: str
    status: str
    provider_link: Optional[str] = None
    reference: str


class PaymentStatusResponse(BaseModel):
    reference: str
    status: str
    amount: Optional[float] = None
    currency: Optional[str] = None
