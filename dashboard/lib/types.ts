/* ============================================================
   TypeScript types matching backend Pydantic schemas
   ============================================================ */

// --- Auth ---
export interface User {
  id: string;
  organization_id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// --- Agent ---
export interface WidgetConfig {
  primary_color: string;
  text_color: string;
  position: "bottom-right" | "bottom-left";
  bubble_icon: string;
  border_radius: number;
  font_family: string;
}

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  welcome_message: string;
  widget_config: WidgetConfig;
  is_active: boolean;
  max_conversation_turns: number;
  total_conversations: number;
  total_messages: number;
  created_at: string;
  updated_at: string;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
}

export interface AgentCreate {
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  welcome_message: string;
  widget_config: WidgetConfig;
  max_conversation_turns: number;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  system_prompt?: string;
  llm_provider?: string;
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
  welcome_message?: string;
  widget_config?: WidgetConfig;
  is_active?: boolean;
}

// --- Conversations ---
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  visitor_id: string;
  status: string;
  summary: string | null;
  metadata_: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface ConversationListItem {
  id: string;
  agent_id: string;
  visitor_id: string;
  status: string;
  summary: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationListResponse {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  page_size: number;
}

// --- Knowledge ---
export interface KnowledgeDocument {
  id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

// --- LLM Providers ---
export type ProvidersMap = Record<string, string[]>;
