import apiClient from "@/lib/axios";
import type { Agent, AgentCreate, AgentListResponse, AgentUpdate, ProvidersMap, WhatsAppConfig, WhatsAppConfigUpdate } from "@/types";

export const agentsService = {
  async list(skip = 0, limit = 50): Promise<AgentListResponse> {
    const { data } = await apiClient.get<AgentListResponse>("/api/v1/agents", { params: { skip, limit } });
    return data;
  },

  async get(id: string): Promise<Agent> {
    const { data } = await apiClient.get<Agent>(`/api/v1/agents/${id}`);
    return data;
  },

  async create(payload: AgentCreate): Promise<Agent> {
    const { data } = await apiClient.post<Agent>("/api/v1/agents", payload);
    return data;
  },

  async update(id: string, payload: AgentUpdate): Promise<Agent> {
    const { data } = await apiClient.put<Agent>(`/api/v1/agents/${id}`, payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/agents/${id}`);
  },

  async providers(): Promise<ProvidersMap> {
    const { data } = await apiClient.get<ProvidersMap>("/api/v1/agents/providers");
    return data;
  },

  async setApiKey(id: string, key: string): Promise<Agent> {
    const { data } = await apiClient.put<Agent>(`/api/v1/agents/${id}`, { llm_api_key: key });
    return data;
  },

  async removeApiKey(id: string): Promise<Agent> {
    const { data } = await apiClient.put<Agent>(`/api/v1/agents/${id}`, { remove_api_key: true });
    return data;
  },

  async getWhatsApp(id: string): Promise<WhatsAppConfig> {
    const { data } = await apiClient.get<WhatsAppConfig>(`/api/v1/agents/${id}/whatsapp`);
    return data;
  },

  async updateWhatsApp(id: string, payload: WhatsAppConfigUpdate): Promise<WhatsAppConfig> {
    const { data } = await apiClient.put<WhatsAppConfig>(`/api/v1/agents/${id}/whatsapp`, payload);
    return data;
  },
};
