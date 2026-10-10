import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';
import type { DashboardSummary, NewsResponse } from '../../shared/api/generated';

const mockDashboard: DashboardSummary = {
  clients_total: 128,
  clients_need_attention: 4,
  open_alerts: 5,
  total_assets: '48200000.00',
  client_count: 128,
  managed_assets: '48200000.00',
  priorities: [
    {
      client: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Mariana Costa',
        risk_profile: 'moderate',
        total_assets: '1280000.00',
      },
      reason_type: 'concentration',
      reason_label: 'Exposição elevada a crédito privado (42%)',
      severity: 'high',
      alert_id: '00000000-0000-0000-0000-000000000101',
    },
    {
      client: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Ricardo Almeida',
        risk_profile: 'conservative',
        total_assets: '740000.00',
      },
      reason_type: 'maturity',
      reason_label: 'CDB com vencimento em 7 dias',
      severity: 'high',
      alert_id: '00000000-0000-0000-0000-000000000102',
    },
    {
      client: {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Carlos Rocha',
        risk_profile: 'moderate',
        total_assets: '890000.00',
      },
      reason_type: 'idle_cash',
      reason_label: 'Saldo disponível acima do habitual em conta',
      severity: 'medium',
      alert_id: '00000000-0000-0000-0000-000000000103',
    },
    {
      client: {
        id: '00000000-0000-0000-0000-000000000006',
        name: 'João Ferreira',
        risk_profile: 'moderate',
        total_assets: '1930000.00',
      },
      reason_type: 'concentration',
      reason_label: 'Concentração relevante em único emissor',
      severity: 'medium',
      alert_id: '00000000-0000-0000-0000-000000000104',
    },
  ],
  priority_clients: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mariana Costa',
      risk_profile: 'moderate',
      total_assets: '1280000.00',
      open_alerts: 2,
      attention_level: 'high',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Ricardo Almeida',
      risk_profile: 'conservative',
      total_assets: '740000.00',
      open_alerts: 1,
      attention_level: 'high',
    },
  ],
};

const mockNewsDay: NewsResponse = {
  period: 'day',
  as_of: '2026-10-10T12:00:00Z',
  items: [
    {
      id: 'news-1',
      title: 'Cenário ilustrativo: possível mudança na trajetória dos juros',
      summary: 'A expectativa para a taxa básica pode afetar a precificação de títulos de renda fixa e exigir acompanhamento.',
      source_name: 'Banco Central / Valor Econômico',
      published_at: '2026-10-10T09:00:00-03:00',
      topic: 'Renda Fixa',
    },
    {
      id: 'news-2',
      title: 'Volatilidade nos mercados acionários internacionais',
      summary: 'Oscilações no exterior podem alterar o apetite por risco em carteiras com exposição à renda variável.',
      source_name: 'Reuters / InfoMoney',
      published_at: '2026-10-10T08:15:00-03:00',
      topic: 'Bolsa',
    },
    {
      id: 'news-3',
      title: 'Atenção ao mercado de crédito privado e spreads',
      summary: 'Movimentações de liquidez são relevantes para avaliar concentração em emissores bancários e debêntures.',
      source_name: 'Exame / Valor',
      published_at: '2026-10-10T07:30:00-03:00',
      topic: 'Crédito Privado',
    },
  ],
};

const mockNewsWeek: NewsResponse = {
  period: 'week',
  as_of: '2026-10-10T12:00:00Z',
  items: [
    {
      id: 'news-4',
      title: 'Panorama semanal: tendências da renda fixa e curva de juros',
      summary: 'Comparativo entre inflação implícita e impacto de marcação a mercado em títulos públicos e privados.',
      source_name: 'Banco Central / InfoMoney',
      published_at: '2026-10-09T11:00:00-03:00',
      topic: 'Renda Fixa',
    },
    {
      id: 'news-5',
      title: 'Desempenho dos principais índices globais e câmbio',
      summary: 'Evolução do Ibovespa, S&P 500 e dólar para contextualizar conversas com investidores.',
      source_name: 'Reuters / Valor Econômico',
      published_at: '2026-10-08T15:00:00-03:00',
      topic: 'Internacional',
    },
    {
      id: 'news-6',
      title: 'Indicadores macroeconômicos e divulgação de IPCA',
      summary: 'Projeções de inflação e atividade econômica com consequências para alocação patrimonial.',
      source_name: 'IBGE / Exame',
      published_at: '2026-10-07T10:00:00-03:00',
      topic: 'Macroeconomia',
    },
  ],
};

export const dashboardApi = {
  summary: (): Promise<DashboardSummary> =>
    env.useMocks
      ? Promise.resolve(mockDashboard)
      : request<DashboardSummary>('/dashboard/summary'),

  news: (period: 'day' | 'week' = 'day'): Promise<NewsResponse> =>
    env.useMocks
      ? Promise.resolve(period === 'day' ? mockNewsDay : mockNewsWeek)
      : request<NewsResponse>(`/news?period=${period}`),
};
