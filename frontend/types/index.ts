// --- Auth ---
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  api_key: string;        // widget auth key
  email_verified: boolean;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  verification_required: boolean;
  email: string;
}

// --- Plan ---
export interface Plan {
  id: string;
  name: string;
  label: string;
  conversations_limit: number;  // -1 = unlimited
  price_monthly_eur: number | null;
  price_semiannual_eur: number | null;
  price_annual_eur: number | null;
  price_monthly_xof: number | null;
  price_semiannual_xof: number | null;
  price_annual_xof: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export type BillingPeriod = "monthly" | "semiannual" | "annual";

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
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  llm_api_key_hint: string | null;
  has_custom_api_key: boolean;
  plan_id: string | null;
  billing_period: BillingPeriod;
  subscription_expires_at: string | null;
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
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  llm_api_key?: string;
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
  llm_api_key?: string;
  remove_api_key?: boolean;
  welcome_message?: string;
  widget_config?: Partial<WidgetConfig>;
  is_active?: boolean;
}

// --- Agent Subscription ---
export interface AgentSubscription {
  agent_id: string;
  plan: Plan | null;
  billing_period: BillingPeriod;
  subscription_expires_at: string | null;
  stripe_subscription_id: string | null;
  sebpay_subscription_ref: string | null;
  conversations_this_month: number;
  conversations_limit: number;
  usage_percent: number | null;
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

// --- Payments ---
export interface PaymentMethods {
  stripe: { enabled: boolean };
  sebpay: { enabled: boolean };
}

export interface SebpayCountry {
  id: string;
  code: string;
  name: string;
  prefix: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface SebpayOperatorOption {
  id: string;
  slug: string;
  label: string;
  country_code: string | null;
  is_active: boolean;
  sort_order: number;
}
