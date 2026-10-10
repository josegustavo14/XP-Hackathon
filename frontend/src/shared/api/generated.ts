/** Tipos equivalentes aos contratos versionados em /contracts. */
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type AssetClass = 'cash' | 'fixed_income' | 'funds' | 'equities' | 'alternatives' | 'other';
export type AlertType = 'concentration' | 'maturity' | 'idle_cash' | 'profile_review' | 'news_impact' | 'other';
export type AlertPriority = 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'reviewed' | 'dismissed';
export type InteractionChannel = 'meeting' | 'call' | 'whatsapp' | 'email' | 'note' | 'other';
export type DataSource = 'internal' | 'open_finance' | 'manual' | 'news' | 'synthetic';

export interface SourceRef {
  type: 'client' | 'position' | 'alert' | 'interaction' | 'news';
  id: string;
  label: string;
  updated_at: string | null;
}

export interface ClientSummary {
  id: string;
  name: string;
  risk_profile: RiskProfile;
  total_assets: string;
  open_alerts: number;
  attention_level: string;
}

export interface DashboardSummary {
  client_count: number;
  managed_assets: string;
  open_alerts: number;
  priority_clients: ClientSummary[];
}

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}
