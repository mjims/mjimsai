import apiClient from "@/lib/axios";
import type { Conversation, ConversationListResponse } from "@/types";

export const conversationsService = {
  async list(params: { page?: number; page_size?: number; agent_id?: string; status?: string } = {}): Promise<ConversationListResponse> {
    const { data } = await apiClient.get<ConversationListResponse>("/api/v1/conversations", { params });
    return data;
  },

  async get(id: string): Promise<Conversation> {
    const { data } = await apiClient.get<Conversation>(`/api/v1/conversations/${id}`);
    return data;
  },

  async close(id: string): Promise<void> {
    await apiClient.patch(`/api/v1/conversations/${id}/close`);
  },
};
