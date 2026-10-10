/** Tipos equivalentes aos contratos versionados em /contracts e OpenAPI. */
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

export interface CopilotChatRequest {
  session_id: string | null;
  message: string;
  client_id: string | null;
}

export interface CopilotSource {
  type: string;
  id: string;
  label: string;
  updated_at: string | null;
}

export interface CopilotSuggestedAction {
  type: string;
  label: string;
  target_id: string;
}

export interface CopilotChatResponse {
  session_id: string;
  message_id: string;
  answer: string;
  sources: CopilotSource[];
  suggested_actions: CopilotSuggestedAction[];
  disclaimer: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  risk_profile: RiskProfile;
  total_assets: string;
  open_alerts: number;
  attention_level: string;
}

export interface DashboardPriorityItem {
  client: {
    id: string;
    name: string;
    risk_profile: RiskProfile;
    total_assets?: string;
  };
  reason_type: string;
  reason_label: string;
  severity: AlertPriority;
  alert_id?: string | null;
}

export interface DashboardSummary {
  /* Contrato da Issue #9 */
  clients_total?: number;
  clients_need_attention?: number;
  open_alerts: number;
  total_assets?: string;
  priorities?: DashboardPriorityItem[];

  /* Compatibilidade com mocks do contrato EP00 */
  client_count?: number;
  managed_assets?: string;
  priority_clients?: ClientSummary[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  published_at: string;
  topic?: string;
  url?: string | null;
}

export interface NewsResponse {
  period: 'day' | 'week';
  as_of?: string;
  items: NewsItem[];
}

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
    trace_id?: string;
  };
}
