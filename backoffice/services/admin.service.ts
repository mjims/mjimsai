import adminClient from "@/lib/axios";
import type { AdminCreate, AdminTokenResponse, AdminUser, LLMModel, LLMModelCreate, PaymentSetting, PaymentSettingUpdate, Plan, PlanCreate, PlatformStats, SebpayCountry, SebpayCountryCreate, SebpayOperator, SebpayOperatorCreate, UserListAdminResponse } from "@/types";

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

  // Payment provider settings
  async getPaymentSettings(): Promise<PaymentSetting[]> {
    const { data } = await adminClient.get<PaymentSetting[]>("/api/v1/admin/payment-settings");
    return data;
  },

  async updatePaymentSetting(provider: string, payload: PaymentSettingUpdate): Promise<PaymentSetting> {
    const { data } = await adminClient.put<PaymentSetting>(`/api/v1/admin/payment-settings/${provider}`, payload);
    return data;
  },

  // Sebpay catalog — countries
  async listSebpayCountries(): Promise<SebpayCountry[]> {
    const { data } = await adminClient.get<SebpayCountry[]>("/api/v1/admin/sebpay/countries");
    return data;
  },
  async createSebpayCountry(payload: SebpayCountryCreate): Promise<SebpayCountry> {
    const { data } = await adminClient.post<SebpayCountry>("/api/v1/admin/sebpay/countries", payload);
    return data;
  },
  async updateSebpayCountry(id: string, payload: Partial<SebpayCountryCreate>): Promise<SebpayCountry> {
    const { data } = await adminClient.put<SebpayCountry>(`/api/v1/admin/sebpay/countries/${id}`, payload);
    return data;
  },
  async deleteSebpayCountry(id: string): Promise<void> {
    await adminClient.delete(`/api/v1/admin/sebpay/countries/${id}`);
  },

  // Sebpay catalog — operators
  async listSebpayOperators(): Promise<SebpayOperator[]> {
    const { data } = await adminClient.get<SebpayOperator[]>("/api/v1/admin/sebpay/operators");
    return data;
  },
  async createSebpayOperator(payload: SebpayOperatorCreate): Promise<SebpayOperator> {
    const { data } = await adminClient.post<SebpayOperator>("/api/v1/admin/sebpay/operators", payload);
    return data;
  },
  async updateSebpayOperator(id: string, payload: Partial<SebpayOperatorCreate>): Promise<SebpayOperator> {
    const { data } = await adminClient.put<SebpayOperator>(`/api/v1/admin/sebpay/operators/${id}`, payload);
    return data;
  },
  async deleteSebpayOperator(id: string): Promise<void> {
    await adminClient.delete(`/api/v1/admin/sebpay/operators/${id}`);
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

  // Admin accounts management
  async listAdmins(): Promise<AdminUser[]> {
    const { data } = await adminClient.get<AdminUser[]>("/api/v1/admin/admins");
    return data;
  },

  async createAdmin(payload: AdminCreate): Promise<AdminUser> {
    const { data } = await adminClient.post<AdminUser>("/api/v1/admin/admins", payload);
    return data;
  },

  async setAdminActive(id: string, is_active: boolean): Promise<AdminUser> {
    const { data } = await adminClient.patch<AdminUser>(`/api/v1/admin/admins/${id}`, { is_active });
    return data;
  },

  async deleteAdmin(id: string): Promise<void> {
    await adminClient.delete(`/api/v1/admin/admins/${id}`);
  },

  // Auth flow (email + password + email-OTP 2FA)
  async login(email: string, password: string, remember: boolean): Promise<{ email: string }> {
    const { data } = await adminClient.post<{ otp_required: boolean; email: string }>(
      "/api/v1/admin/auth/login", { email, password, remember },
    );
    return data;
  },

  async verifyOtp(email: string, code: string, remember: boolean): Promise<AdminTokenResponse> {
    const { data } = await adminClient.post<AdminTokenResponse>(
      "/api/v1/admin/auth/verify-otp", { email, code, remember },
    );
    localStorage.setItem("mjimsai_admin_token", data.access_token);
    localStorage.setItem("mjimsai_admin", JSON.stringify(data.admin));
    return data;
  },

  async acceptInvite(token: string, password: string): Promise<AdminTokenResponse> {
    const { data } = await adminClient.post<AdminTokenResponse>(
      "/api/v1/admin/auth/accept-invite", { token, password },
    );
    localStorage.setItem("mjimsai_admin_token", data.access_token);
    localStorage.setItem("mjimsai_admin", JSON.stringify(data.admin));
    return data;
  },

  async getMe(): Promise<AdminUser> {
    const { data } = await adminClient.get<AdminUser>("/api/v1/admin/auth/me");
    return data;
  },

  async updateMe(payload: {
    first_name?: string; last_name?: string; email?: string;
    current_password?: string; new_password?: string;
  }): Promise<AdminUser> {
    const { data } = await adminClient.put<AdminUser>("/api/v1/admin/auth/me", payload);
    localStorage.setItem("mjimsai_admin", JSON.stringify(data));
    return data;
  },

  getAdmin(): AdminUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("mjimsai_admin");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("mjimsai_admin_token");
  },

  logout() {
    localStorage.removeItem("mjimsai_admin_token");
    localStorage.removeItem("mjimsai_admin");
    window.location.href = "/login";
  },
};
