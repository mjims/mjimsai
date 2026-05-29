/* ============================================================
   API Client — centralized fetch wrapper with auth
   ============================================================ */

import type { TokenResponse, User, Organization, Agent, AgentListResponse, AgentCreate, AgentUpdate, ConversationListResponse, Conversation, ProvidersMap, KnowledgeDocument } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mila_token");
}

function setToken(token: string): void {
  localStorage.setItem("mila_token", token);
}

function clearToken(): void {
  localStorage.removeItem("mila_token");
  localStorage.removeItem("mila_user");
}

function setUser(user: User): void {
  localStorage.setItem("mila_user", JSON.stringify(user));
}

function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("mila_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(body.detail || "Request failed", res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---
export const auth = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const data = await request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    setUser(data.user);
    return data;
  },

  async register(params: {
    org_name: string;
    org_slug: string;
    email: string;
    username: string;
    password: string;
    full_name?: string;
  }): Promise<TokenResponse> {
    const data = await request<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
    setToken(data.access_token);
    setUser(data.user);
    return data;
  },

  async me(): Promise<User> {
    return request<User>("/api/v1/auth/me");
  },

  async organization(): Promise<Organization> {
    return request<Organization>("/api/v1/auth/organization");
  },

  logout(): void {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  getToken,
  getUser,
  isAuthenticated(): boolean {
    return !!getToken();
  },
};

// --- Agents ---
export const agents = {
  async list(skip = 0, limit = 50): Promise<AgentListResponse> {
    return request<AgentListResponse>(`/api/v1/agents?skip=${skip}&limit=${limit}`);
  },

  async get(id: string): Promise<Agent> {
    return request<Agent>(`/api/v1/agents/${id}`);
  },

  async create(data: AgentCreate): Promise<Agent> {
    return request<Agent>("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: AgentUpdate): Promise<Agent> {
    return request<Agent>(`/api/v1/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/agents/${id}`, { method: "DELETE" });
  },

  async providers(): Promise<ProvidersMap> {
    return request<ProvidersMap>("/api/v1/agents/providers");
  },
};

// --- Conversations ---
export const conversations = {
  async list(params?: {
    agent_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ConversationListResponse> {
    const query = new URLSearchParams();
    if (params?.agent_id) query.set("agent_id", params.agent_id);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    return request<ConversationListResponse>(`/api/v1/conversations?${query}`);
  },

  async get(id: string): Promise<Conversation> {
    return request<Conversation>(`/api/v1/conversations/${id}`);
  },

  async close(id: string): Promise<void> {
    return request<void>(`/api/v1/conversations/${id}/close`, { method: "PATCH" });
  },
};

// --- Knowledge ---
export const knowledge = {
  async list(agentId: string): Promise<{ documents: KnowledgeDocument[] }> {
    return request<{ documents: KnowledgeDocument[] }>(`/api/v1/agents/${agentId}/knowledge`);
  },

  async upload(agentId: string, file: File): Promise<KnowledgeDocument> {
    const formData = new FormData();
    formData.append("file", file);
    return request<KnowledgeDocument>(`/api/v1/agents/${agentId}/knowledge`, {
      method: "POST",
      body: formData,
    });
  },

  async delete(agentId: string, documentId: string): Promise<void> {
    return request<void>(`/api/v1/agents/${agentId}/knowledge/${documentId}`, {
      method: "DELETE",
    });
  },
};

export { ApiError };
