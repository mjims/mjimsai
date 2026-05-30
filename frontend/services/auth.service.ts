import apiClient from "@/lib/axios";
import type { TokenResponse, User } from "@/types";

export const authService = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/login", { email, password });
    localStorage.setItem("mjimsai_token", data.access_token);
    localStorage.setItem("mjimsai_user", JSON.stringify(data.user));
    return data;
  },

  async register(params: { email: string; username: string; password: string; full_name?: string }): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/register", params);
    localStorage.setItem("mjimsai_token", data.access_token);
    localStorage.setItem("mjimsai_user", JSON.stringify(data.user));
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>("/api/v1/auth/me");
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
