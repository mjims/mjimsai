export interface Plan {
  id: string;
  name: string;
  label: string;
  conversations_limit: number;
  price_monthly_eur: number | null;
  price_semiannual_eur: number | null;
  price_annual_eur: number | null;
  price_monthly_xof: number | null;
  price_semiannual_xof: number | null;
  price_annual_xof: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanCreate {
  name: string;
  label: string;
  conversations_limit: number;
  price_monthly_eur?: number | null;
  price_semiannual_eur?: number | null;
  price_annual_eur?: number | null;
  price_monthly_xof?: number | null;
  price_semiannual_xof?: number | null;
  price_annual_xof?: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface LLMModel {
  id: string;
  provider: string;
  model_id: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LLMModelCreate {
  provider: string;
  model_id: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface UserAdminResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  api_key: string;
  email_verified: boolean;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  agent_count: number;
}

// --- Admin accounts & auth ---
export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminCreate {
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminTokenResponse {
  access_token: string;
  token_type: string;
  admin: AdminUser;
}

export interface UserListAdminResponse {
  users: UserAdminResponse[];
  total: number;
}

export interface PlatformStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_agents: number;
  total_conversations_this_month: number;
  plans: Record<string, number>; // plan_name → agent count
}
