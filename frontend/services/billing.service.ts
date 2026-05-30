import apiClient from "@/lib/axios";
import type { AgentSubscription, BillingPeriod, Plan, SebpayOperator } from "@/types";

export const billingService = {
  async getPlans(): Promise<Plan[]> {
    const { data } = await apiClient.get<Plan[]>("/api/v1/billing/plans");
    return data;
  },

  async getAgentSubscription(agentId: string): Promise<AgentSubscription> {
    const { data } = await apiClient.get<AgentSubscription>(`/api/v1/billing/agents/${agentId}/subscription`);
    return data;
  },

  async subscribeStripe(agentId: string, planId: string, period: BillingPeriod, successUrl: string, cancelUrl: string): Promise<{ url: string }> {
    const { data } = await apiClient.post<{ url: string }>(`/api/v1/billing/agents/${agentId}/subscribe/stripe`, {
      plan_id: planId,
      billing_period: period,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return data;
  },

  async subscribeSebpay(agentId: string, params: {
    plan_id: string;
    billing_period: BillingPeriod;
    phone: string;          // without +
    operator: SebpayOperator;
    country?: string;
  }): Promise<{ transaction_id: string; status: string; provider_link?: string; reference: string }> {
    const { data } = await apiClient.post(`/api/v1/billing/agents/${agentId}/subscribe/sebpay`, params);
    return data;
  },

  async getPaymentStatus(reference: string): Promise<{ reference: string; status: string }> {
    const { data } = await apiClient.get(`/api/v1/billing/payment/${reference}`);
    return data;
  },
};
