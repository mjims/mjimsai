import apiClient from "@/lib/axios";
import type { KnowledgeDocument } from "@/types";

export const knowledgeService = {
  async list(agentId: string): Promise<KnowledgeDocument[]> {
    const { data } = await apiClient.get<{ documents: KnowledgeDocument[] }>(`/api/v1/agents/${agentId}/knowledge`);
    return data.documents ?? [];
  },

  async upload(agentId: string, file: File): Promise<KnowledgeDocument> {
    const form = new FormData();
    form.append("file", file);
    // Axios auto-sets Content-Type: multipart/form-data when body is FormData
    const { data } = await apiClient.post<KnowledgeDocument>(`/api/v1/agents/${agentId}/knowledge`, form);
    return data;
  },

  async delete(agentId: string, docId: string): Promise<void> {
    await apiClient.delete(`/api/v1/agents/${agentId}/knowledge/${docId}`);
  },
};
