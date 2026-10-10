/**
 * Contratos provisórios equivalentes aos mocks.
 * Substituir por tipos gerados de contracts/openapi.json quando houver FastAPI.
 */

export type Decimal = string;
export type UUID = string;

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ClientSummary {
  id: UUID;
  name: string;
  risk_profile: 'conservador' | 'moderado' | 'arrojado';
  net_worth: Decimal;
}

export interface Position {
  asset_code: string;
  asset_name: string;
  asset_class: 'fixed_income' | 'equity' | 'fund';
  quantity: Decimal;
  unit_price: Decimal;
  market_value: Decimal;
  source: 'synthetic';
}

export interface Alert {
  id: UUID;
  client_id: UUID;
  kind: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
}

export interface Interaction {
  id: UUID;
  client_id: UUID;
  channel: 'meeting' | 'phone' | 'email';
  occurred_at: string;
  summary: string;
}

export interface AiReference {
  source: 'client' | 'portfolio' | 'alert' | 'interaction';
  id: UUID;
  label: string;
  as_of: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    request_id: UUID;
  };
}
