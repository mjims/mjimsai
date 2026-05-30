import axios, { type AxiosError } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach JWT Bearer token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("mjimsai_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: clear stored auth and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("mjimsai_token");
      localStorage.removeItem("mjimsai_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default apiClient;

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return (data.detail as Array<{msg: string}>)[0]?.msg ?? "Erreur inconnue";
  }
  return "Erreur inconnue";
}
