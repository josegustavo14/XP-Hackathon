/**
 * Tipos derivados do contrato OpenAPI. Enquanto o schema oficial não estiver
 * versionado, estes tipos são o ponto único consumido pelas features.
 */
export interface ClientSummary {
  id: string;
  name: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
  netWorth: string;
}

export interface DashboardSummary {
  clientCount: number;
  managedAssets: string;
  activeAlerts: number;
  priorityClients: ClientSummary[];
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}
