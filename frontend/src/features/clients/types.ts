import type { RiskProfile } from '../../shared/api/generated';

export interface ClientItem {
  id: string;
  name: string;
  risk_profile: RiskProfile | string;
  net_worth: number | string;
  institutions_count: number;
  active_alerts_count: number;
  city: string;
  primary_objective?: string;
  next_contact_date?: string;
  email?: string;
}

export interface ClientDetailData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city: string;
  state?: string;
  risk_profile: string;
  suitability_expires_at?: string;
  investment_horizon_yrs?: number;
  liquidity_need?: string;
  preferences?: {
    preferred_channel?: string;
    contact_period?: string;
    notes?: string;
  };
  last_contact_at?: string;
  next_contact_at?: string;
  net_worth: number | string;
  open_alerts: number;
  institutions_count: number;
  primary_objective?: string;
  created_at?: string;
}

export interface PortfolioPosition {
  asset_code: string;
  asset_name: string;
  asset_class: 'fixed_income' | 'equity' | 'fund' | 'cash' | 'multimarket' | string;
  issuer: string;
  quantity: string | number;
  unit_price: string | number;
  market_value: string | number;
  maturity_date?: string | null;
  source: string;
}

export interface AssetAllocationItem {
  asset_class: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface InstitutionAllocationItem {
  name: string;
  value: number;
  percentage: number;
  source: string;
}

export interface ClientPortfolioData {
  client_id: string;
  as_of: string;
  total_value: number | string;
  cash_value: number;
  cash_percentage: number;
  positions: PortfolioPosition[];
  allocation_by_class: AssetAllocationItem[];
  institutions: InstitutionAllocationItem[];
}

export interface ClientGoalItem {
  id: string;
  client_id: string;
  name: string;
  target_value: number | string;
  current_value: number | string;
  progress_percentage: number;
  target_date: string;
  status: 'in_progress' | 'completed' | 'attention';
}

export interface ClientInteractionItem {
  id: string;
  client_id: string;
  channel: 'meeting' | 'call' | 'phone' | 'whatsapp' | 'email' | 'note';
  occurred_at: string;
  summary: string;
  next_step?: string | null;
  advisor_name?: string;
  attachment_name?: string;
  attachment_type?: 'minutes' | 'transcription';
  transcription?: string;
}

export interface ClientAlertItem {
  id: string;
  client_id: string;
  reason_type: string;
  reason_label: string;
  severity: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface CreateInteractionPayload {
  channel: 'meeting' | 'call' | 'whatsapp' | 'email' | 'note';
  summary: string;
  next_step?: string;
  occurred_at?: string;
}

export interface ClientFilterParams {
  query?: string;
  risk_profile?: string;
  page?: number;
  page_size?: number;
}

export interface ClientsListResponse {
  items: ClientItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
