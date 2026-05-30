import axios, { type AxiosError } from "axios";

const adminClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach admin JWT from localStorage
adminClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("mjimsai_admin_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// On 401: redirect to login (skip auth endpoints so login errors show inline)
adminClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const url = err.config?.url || "";
    const isAuthCall = url.includes("/admin/auth/");
    if (err.response?.status === 401 && !isAuthCall && typeof window !== "undefined") {
      localStorage.removeItem("mjimsai_admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default adminClient;

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (typeof data?.detail === "string") return data.detail;
  }
  return "Erreur inconnue";
}
