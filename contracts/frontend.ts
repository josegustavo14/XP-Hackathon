/** Tipos compartilháveis pelo frontend enquanto o OpenAPI não estiver disponível. */
export type Uuid = string;
export type DecimalString = string;
export type Iso8601DateTime = string;
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type AssetClass = 'cash' | 'fixed_income' | 'funds' | 'equities' | 'alternatives' | 'other';
export type AlertPriority = 'high' | 'medium' | 'low';
export type InteractionChannel = 'meeting' | 'call' | 'whatsapp' | 'email' | 'note' | 'other';
export type DataSource = 'internal' | 'open_finance' | 'manual' | 'news' | 'synthetic';
export interface Money { amount: DecimalString; currency: 'BRL'; }
export interface PaginationMeta { page: number; page_size: number; total: number; total_pages: number; }
export interface PaginatedResponse<T> { items: T[]; meta: PaginationMeta; }
export interface ApiErrorPayload { error: { code: string; message: string; details?: Record<string, unknown>; trace_id: Uuid; }; }
