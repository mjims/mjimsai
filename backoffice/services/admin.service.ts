import adminClient from "@/lib/axios";
import type { LLMModel, LLMModelCreate, Plan, PlanCreate, PlatformStats, UserListAdminResponse } from "@/types";

export const adminService = {
  // Plans CRUD
  async listPlans(): Promise<Plan[]> {
    const { data } = await adminClient.get<Plan[]>("/api/v1/admin/plans");
    return data;
  },

  async getPlan(id: string): Promise<Plan> {
    const { data } = await adminClient.get<Plan>(`/api/v1/admin/plans/${id}`);
    return data;
  },

  async createPlan(payload: PlanCreate): Promise<Plan> {
    const { data } = await adminClient.post<Plan>("/api/v1/admin/plans", payload);
    return data;
  },

  async updatePlan(id: string, payload: Partial<PlanCreate>): Promise<Plan> {
    const { data } = await adminClient.put<Plan>(`/api/v1/admin/plans/${id}`, payload);
    return data;
  },

  async deletePlan(id: string): Promise<void> {
    await adminClient.delete(`/api/v1/admin/plans/${id}`);
  },

  // LLM Models CRUD
  async listSupportedProviders(): Promise<string[]> {
    const { data } = await adminClient.get<string[]>("/api/v1/admin/providers");
    return data;
  },

  async listModels(): Promise<LLMModel[]> {
    const { data } = await adminClient.get<LLMModel[]>("/api/v1/admin/models");
    return data;
  },

  async createModel(payload: LLMModelCreate): Promise<LLMModel> {
    const { data } = await adminClient.post<LLMModel>("/api/v1/admin/models", payload);
    return data;
  },

  async updateModel(id: string, payload: Partial<LLMModelCreate>): Promise<LLMModel> {
    const { data } = await adminClient.put<LLMModel>(`/api/v1/admin/models/${id}`, payload);
    return data;
  },

  async deleteModel(id: string): Promise<void> {
    await adminClient.delete(`/api/v1/admin/models/${id}`);
  },

  // Stats
  async getStats(): Promise<PlatformStats> {
    const { data } = await adminClient.get<PlatformStats>("/api/v1/admin/stats");
    return data;
  },

  // Users
  async listUsers(skip = 0, limit = 50): Promise<UserListAdminResponse> {
    const { data } = await adminClient.get<UserListAdminResponse>("/api/v1/admin/users", { params: { skip, limit } });
    return data;
  },

  async suspendUser(id: string, suspended: boolean): Promise<void> {
    await adminClient.patch(`/api/v1/admin/users/${id}/suspend`, { suspended });
  },

  async getHealth(): Promise<{ database: string; status: string }> {
    const { data } = await adminClient.get("/api/v1/admin/health");
    return data;
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("mjimsai_admin_token");
  },

  login(key: string) {
    localStorage.setItem("mjimsai_admin_token", key);
  },

  logout() {
    localStorage.removeItem("mjimsai_admin_token");
    window.location.href = "/login";
  },
};
