import apiClient from "@/lib/axios";
import type { RegisterResponse, TokenResponse, User } from "@/types";

function persistSession(data: TokenResponse) {
  localStorage.setItem("mjimsai_token", data.access_token);
  localStorage.setItem("mjimsai_user", JSON.stringify(data.user));
}

export const authService = {
  async login(email: string, password: string, remember = false): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/login", { email, password, remember });
    persistSession(data);
    return data;
  },

  async register(params: { email: string; first_name: string; last_name: string; password: string }): Promise<RegisterResponse> {
    const { data } = await apiClient.post<RegisterResponse>("/api/v1/auth/register", params);
    return data;
  },

  async verifyEmail(email: string, code: string, remember = false): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/verify-email", { email, code, remember });
    persistSession(data);
    return data;
  },

  async resendOtp(email: string): Promise<void> {
    await apiClient.post("/api/v1/auth/resend-otp", { email });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/api/v1/auth/forgot-password", { email });
  },

  async resetPassword(email: string, code: string, new_password: string, remember = false): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/reset-password", { email, code, new_password, remember });
    persistSession(data);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>("/api/v1/auth/me");
    return data;
  },

  async updateProfile(payload: {
    first_name?: string; last_name?: string; email?: string;
    current_password?: string; new_password?: string;
  }): Promise<User> {
    const { data } = await apiClient.put<User>("/api/v1/auth/me", payload);
    localStorage.setItem("mjimsai_user", JSON.stringify(data));
    return data;
  },

  logout() {
    localStorage.removeItem("mjimsai_token");
    localStorage.removeItem("mjimsai_user");
    window.location.href = "/login";
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("mjimsai_token");
  },

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("mjimsai_user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
