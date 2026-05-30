"""
Billing routes — plans from DB, per-agent subscriptions (Stripe + Sebpay).
Payment provider config (keys, base URL, enabled) is admin-managed in the DB.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.agent import Agent
from app.models.plan import Plan
from app.models.sebpay_country import SebpayCountry
from app.models.sebpay_operator import SebpayOperator
from app.models.user import User
from app.schemas.billing import (
    AgentSubscriptionResponse,
    PaymentStatusResponse,
    SebpayCheckoutResponse,
    SebpaySubscribeRequest,
    StripeCheckoutResponse,
    StripeSubscribeRequest,
)
from app.schemas.plan import PlanResponse
from app.schemas.sebpay_catalog import SebpayCountryResponse, SebpayOperatorResponse
from app.services import payment_settings_service, usage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/plans", response_model=list[PlanResponse])
async def get_plans(db: AsyncSession = Depends(get_db)):
    """Return all active plans ordered by sort_order (no auth required)."""
    result = await db.execute(
        select(Plan).where(Plan.is_active == True).order_by(Plan.sort_order.asc())  # noqa: E712
    )
    return result.scalars().all()


@router.get("/payment-methods")
async def get_payment_methods(db: AsyncSession = Depends(get_db)):
    """Which payment methods are enabled (drives the frontend UI)."""
    return {
        "stripe": {"enabled": await payment_settings_service.is_enabled(db, "stripe")},
        "sebpay": {"enabled": await payment_settings_service.is_enabled(db, "sebpay")},
    }


@router.get("/sebpay/countries", response_model=list[SebpayCountryResponse])
async def list_sebpay_countries(db: AsyncSession = Depends(get_db)):
    """Active Sebpay countries (no auth)."""
    result = await db.execute(
        select(SebpayCountry).where(SebpayCountry.is_active == True)  # noqa: E712
        .order_by(SebpayCountry.sort_order, SebpayCountry.name)
    )
    return result.scalars().all()


@router.get("/sebpay/operators", response_model=list[SebpayOperatorResponse])
async def list_sebpay_operators(
    country: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Active operators available for a country (global ones included)."""
    query = select(SebpayOperator).where(SebpayOperator.is_active == True)  # noqa: E712
    if country:
        query = query.where(
            or_(SebpayOperator.country_code.is_(None), SebpayOperator.country_code == country.upper())
        )
    result = await db.execute(query.order_by(SebpayOperator.sort_order, SebpayOperator.slug))
    return result.scalars().all()


@router.get("/agents/{agent_id}/subscription", response_model=AgentSubscriptionResponse)
async def get_agent_subscription(
    agent_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current plan and usage for a specific agent."""
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    plan = None
    limit = 100
    if agent.plan_id:
        plan_result = await db.execute(select(Plan).where(Plan.id == agent.plan_id))
        plan = plan_result.scalar_one_or_none()
        if plan:
            limit = plan.conversations_limit

    usage = await usage_service.get_current_usage(db, agent.id)
    count = usage.conversations_count if usage else 0

    return AgentSubscriptionResponse(
        agent_id=agent.id,
        plan=PlanResponse.model_validate(plan) if plan else None,
        billing_period=agent.billing_period,
        subscription_expires_at=agent.subscription_expires_at,
        stripe_subscription_id=agent.stripe_subscription_id,
        sebpay_subscription_ref=agent.sebpay_subscription_ref,
        conversations_this_month=count,
        conversations_limit=limit,
        usage_percent=round(count / limit * 100, 1) if limit > 0 else None,
    )


# --- Stripe ---

@router.post("/agents/{agent_id}/subscribe/stripe", response_model=StripeCheckoutResponse)
async def stripe_subscribe(
    agent_id: uuid.UUID,
    data: StripeSubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session to subscribe an agent to a plan."""
    cfg = await payment_settings_service.get_config(db, "stripe")
    if not cfg.is_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Stripe payments are disabled")
    if not cfg.secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")

    result = await db.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    plan_result = await db.execute(select(Plan).where(Plan.id == data.plan_id, Plan.is_active == True))  # noqa: E712
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    try:
        import stripe
        stripe.api_key = cfg.secret_key

        # Stripe Price IDs should be configured per plan/period in your Stripe dashboard
        price_id = f"price_{plan.name}_{data.billing_period}"  # convention — configure in Stripe

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user.email,
            metadata={
                "agent_id": str(agent.id),
                "plan_id": str(plan.id),
                "plan_name": plan.name,
                "billing_period": data.billing_period,
            },
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=data.success_url,
            cancel_url=data.cancel_url,
        )
        return StripeCheckoutResponse(url=session.url)
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook — update agent plan on successful subscription."""
    cfg = await payment_settings_service.get_config(db, "stripe")
    if not cfg.secret_key or not cfg.webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        import stripe
        stripe.api_key = cfg.secret_key
        event = stripe.Webhook.construct_event(payload, sig_header, cfg.webhook_secret)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if event["type"] in ("customer.subscription.updated", "customer.subscription.created"):
        subscription = event["data"]["object"]
        meta = subscription.get("metadata", {})
        agent_id = meta.get("agent_id")
        plan_id = meta.get("plan_id")
        billing_period = meta.get("billing_period", "monthly")

        if agent_id and plan_id:
            plan_result = await db.execute(select(Plan).where(Plan.id == uuid.UUID(plan_id)))
            plan = plan_result.scalar_one_or_none()
            agent_result = await db.execute(select(Agent).where(Agent.id == uuid.UUID(agent_id)))
            agent = agent_result.scalar_one_or_none()
            if agent and plan:
                agent.plan_id = plan.id
                agent.billing_period = billing_period
                agent.stripe_subscription_id = subscription["id"]
                await db.commit()

    return {"received": True}


# --- Sebpay ---

@router.post("/agents/{agent_id}/subscribe/sebpay", response_model=SebpayCheckoutResponse)
async def sebpay_subscribe(
    agent_id: uuid.UUID,
    data: SebpaySubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate Mobile Money payment via Sebpay to subscribe an agent to a plan."""
    cfg = await payment_settings_service.get_config(db, "sebpay")
    if not cfg.is_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sebpay payments are disabled")
    if not cfg.public_key or not cfg.secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sebpay not configured")

    result = await db.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    plan_result = await db.execute(select(Plan).where(Plan.id == data.plan_id, Plan.is_active == True))  # noqa: E712
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    # Determine amount based on billing period
    amount_xof = {
        "monthly": plan.price_monthly_xof,
        "semiannual": plan.price_semiannual_xof,
        "annual": plan.price_annual_xof,
    }.get(data.billing_period, plan.price_monthly_xof)

    if amount_xof is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No XOF price defined for this plan/period")

    settings = get_settings()
    reference = f"MJIMSAI-{agent.id}-{uuid.uuid4().hex[:8].upper()}"
    callback_url = data.callback_url or f"{settings.cors_origins_list[0]}/api/v1/billing/webhook/sebpay"

    # Phone must be without '+' per Sebpay API spec
    phone = data.phone.lstrip("+")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{cfg.base_url}/collections",
                headers={
                    "X-Public-Key": cfg.public_key,
                    "X-Secret-Key": cfg.secret_key,
                    "Content-Type": "application/json",
                },
                json={
                    "amount": amount_xof,
                    "currency": "XOF",
                    "phone": phone,
                    "operator": data.operator,  # mtn | moov | orange | wav
                    "country": data.country,
                    "external_reference": reference,
                    "callback_url": callback_url,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            result_data = response.json()
    except httpx.HTTPError as e:
        logger.error(f"Sebpay API error: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Sebpay payment initiation failed")

    payload_data = result_data.get("data", {})
    return SebpayCheckoutResponse(
        transaction_id=payload_data.get("transaction_id", ""),
        status=payload_data.get("status", "pending"),
        provider_link=payload_data.get("provider_link"),
        reference=reference,
    )


@router.post("/webhook/sebpay")
async def sebpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Sebpay payment callbacks — activate agent plan on approval."""
    cfg = await payment_settings_service.get_config(db, "sebpay")

    raw_body = await request.body()

    # Fail closed: reject if secret missing or signature header absent
    if not cfg.secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sebpay webhook not configured")
    sig_header = request.headers.get("X-SebPay-Signature", "")
    if not sig_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-SebPay-Signature header")

    expected = hmac.new(cfg.secret_key.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    transaction_status = payload.get("status")
    external_reference = payload.get("external_reference", "")

    if transaction_status == "approved" and external_reference.startswith("MJIMSAI-"):
        parts = external_reference.split("-")
        # Reference format: MJIMSAI-{agent_id}-{suffix}
        if len(parts) >= 2:
            try:
                agent_id = uuid.UUID(parts[1])
                agent_result = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = agent_result.scalar_one_or_none()
                if agent:
                    agent.sebpay_subscription_ref = external_reference
                    await db.commit()
                    logger.info(f"Sebpay payment confirmed for agent {agent_id}: {external_reference}")
            except (ValueError, IndexError):
                pass

    return {"received": True}


@router.get("/payment/{reference}", response_model=PaymentStatusResponse)
async def get_payment_status(
    reference: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query status of a Sebpay payment. Reference must belong to one of the user's agents."""
    # IDOR guard: extract agent_id from reference and verify ownership
    parts = reference.split("-")
    if len(parts) < 2 or not reference.startswith("MJIMSAI-"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    try:
        agent_id = uuid.UUID(parts[1])
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    agent_result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id)
    )
    if not agent_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    cfg = await payment_settings_service.get_config(db, "sebpay")
    if not cfg.public_key or not cfg.secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sebpay not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{cfg.base_url}/collections/{reference}",
                headers={
                    "X-Public-Key": cfg.public_key,
                    "X-Secret-Key": cfg.secret_key,
                },
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json().get("data", {})
    except httpx.HTTPError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return PaymentStatusResponse(
        reference=reference,
        status=data.get("status", "unknown"),
        amount=data.get("amount"),
        currency=data.get("currency"),
    )
