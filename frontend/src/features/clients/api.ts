import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';
import type {
  ClientItem,
  ClientDetailData,
  ClientPortfolioData,
  ClientGoalItem,
  ClientInteractionItem,
  ClientAlertItem,
  CreateInteractionPayload,
  ClientFilterParams,
  ClientsListResponse,
} from './types';
import {
  MOCK_CLIENTS,
  MOCK_INTERACTIONS_MAP,
  MOCK_GOALS,
  MOCK_ALERTS,
  createMockPortfolio,
} from './mockData';

// Re-export all types so existing consumers continue to work seamlessly
export type {
  ClientItem,
  ClientDetailData,
  ClientPortfolioData,
  PortfolioPosition,
  AssetAllocationItem,
  InstitutionAllocationItem,
  ClientGoalItem,
  ClientInteractionItem,
  ClientAlertItem,
  CreateInteractionPayload,
  ClientFilterParams,
  ClientsListResponse,
} from './types';

export const normalizeRiskProfile = (profile: string): string => {
  const p = profile.toLowerCase();
  if (p === 'conservador' || p === 'conservative') return 'Conservador';
  if (p === 'moderado' || p === 'moderate') return 'Moderado';
  if (p === 'arrojado' || p === 'aggressive') return 'Arrojado';
  return profile;
};

export const normalizeRiskProfileToContract = (profile: string): string => {
  const p = profile.toLowerCase();
  if (p === 'conservador' || p === 'conservative') return 'conservative';
  if (p === 'moderado' || p === 'moderate') return 'moderate';
  if (p === 'arrojado' || p === 'aggressive') return 'aggressive';
  return profile;
};

function listMockClients(params: ClientFilterParams = {}): ClientsListResponse {
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 10;
  const query = (params.query ?? '').trim().toLowerCase();
  const risk = params.risk_profile ?? 'Todos';
  let filtered = [...MOCK_CLIENTS];

  if (query) {
    filtered = filtered.filter(
      (client) =>
        client.name.toLowerCase().includes(query)
        || client.city.toLowerCase().includes(query)
        || (client.email && client.email.toLowerCase().includes(query))
        || (client.primary_objective && client.primary_objective.toLowerCase().includes(query)),
    );
  }
  if (risk && risk !== 'Todos') {
    const targetRisk = normalizeRiskProfile(risk);
    filtered = filtered.filter((client) => normalizeRiskProfile(client.risk_profile) === targetRisk);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  return {
    items: filtered.slice(startIndex, startIndex + pageSize),
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
  };
}

export const clientsApi = {
  list: async (params: ClientFilterParams = {}): Promise<ClientsListResponse> => {
    const useMocks = env.mode === 'mock';
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 10;
    const query = (params.query ?? '').trim().toLowerCase();
    const risk = params.risk_profile ?? 'Todos';

    if (useMocks) return listMockClients(params);

    try {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set('search', query);
      if (risk && risk !== 'Todos') {
        searchParams.set('risk_profile', normalizeRiskProfileToContract(risk));
      }
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));

      const data = await request<Record<string, unknown>>(`/clients?${searchParams.toString()}`);
      const rawItems = (data.items as Array<Record<string, unknown>>) || [];
      const meta = (data.meta as Record<string, unknown> | undefined) ?? data;
      return {
        items: rawItems.map((item) => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? 'Cliente sem nome'),
          risk_profile: String(item.risk_profile ?? 'moderate'),
          net_worth: (item.net_worth as number | string) ?? '0.00',
          institutions_count: Number(item.institutions_count ?? 1),
          active_alerts_count: Number(item.active_alerts_count ?? item.open_alerts ?? 0),
          city: String(item.city ?? 'Brasil'),
          primary_objective: item.primary_objective ? String(item.primary_objective) : undefined,
          next_contact_date: item.next_contact_date ? String(item.next_contact_date) : undefined,
          email: item.email ? String(item.email) : undefined,
        })),
        page: Number(meta.page ?? page),
        page_size: Number(meta.page_size ?? pageSize),
        total: Number(meta.total ?? 0),
        total_pages: Number(meta.total_pages ?? 1),
      };
    } catch (err) {
      console.warn('Fallback para mock de clientes após erro na API:', err);
      return listMockClients({ ...params, page, page_size: pageSize });
    }
  },

  getById: async (clientId: string): Promise<ClientDetailData> => {
    const useMocks = env.mode === 'mock';

    if (!useMocks) {
      try {
        const raw = await request<Record<string, unknown>>(`/clients/${clientId}`);
        return {
          id: String(raw.id ?? clientId),
          name: String(raw.name ?? 'Cliente'),
          email: raw.email ? String(raw.email) : 'cliente@example.test',
          phone: raw.phone ? String(raw.phone) : '+55 11 98888-0000',
          city: String(raw.city ?? 'São Paulo'),
          state: raw.state ? String(raw.state) : 'SP',
          risk_profile: String(raw.risk_profile ?? 'moderate'),
          suitability_expires_at: raw.suitability_expires_at ? String(raw.suitability_expires_at) : '2027-04-15',
          investment_horizon_yrs: Number(raw.investment_horizon_yrs ?? 10),
          liquidity_need: String(raw.liquidity_need ?? 'Baixa a Moderada'),
          preferences: (raw.preferences as ClientDetailData['preferences']) || {
            preferred_channel: 'WhatsApp e Reunião',
            contact_period: 'Tarde (após 14h)',
            notes: 'Preferência por produtos isentos de IR e ativos de renda fixa bancária/crédito estruturado.',
          },
          last_contact_at: raw.last_contact_at ? String(raw.last_contact_at) : '2026-10-03T15:00:00Z',
          next_contact_at: raw.next_contact_at ? String(raw.next_contact_at) : '2026-10-14',
          net_worth: (raw.net_worth as number | string) ?? 1280000,
          open_alerts: Number(raw.open_alerts ?? 2),
          institutions_count: Number(raw.institutions_count ?? 3),
          primary_objective: raw.primary_objective ? String(raw.primary_objective) : 'Aposentadoria em 2045',
          created_at: raw.created_at ? String(raw.created_at) : '2026-01-15T10:00:00Z',
        };
      } catch (err) {
        console.warn(`Fallback para mock do perfil do cliente ${clientId}:`, err);
      }
    }

    const foundMock = MOCK_CLIENTS.find((c) => c.id === clientId) || MOCK_CLIENTS[0];
    return {
      id: foundMock.id,
      name: foundMock.name,
      email: foundMock.email || `${foundMock.name.toLowerCase().replace(/\s+/g, '.')}@example.test`,
      phone: '+55 11 98765-4321',
      city: foundMock.city.split('·')[0]?.trim() || foundMock.city,
      state: foundMock.city.split('·')[1]?.trim() || 'SP',
      risk_profile: foundMock.risk_profile,
      suitability_expires_at: '2027-06-30',
      investment_horizon_yrs: 8,
      liquidity_need: 'Moderada (reserva de emergência preservada)',
      preferences: {
        preferred_channel: 'WhatsApp e Chamada de Vídeo',
        contact_period: 'Período da tarde (14h - 17h)',
        notes: 'Interesse em fundos indexados à inflação e títulos isentos de Imposto de Renda (LCI/LCA/CRI).',
      },
      last_contact_at: '2026-10-03T15:00:00Z',
      next_contact_at: foundMock.next_contact_date || '14/10/2026',
      net_worth: foundMock.net_worth,
      open_alerts: foundMock.active_alerts_count,
      institutions_count: foundMock.institutions_count,
      primary_objective: foundMock.primary_objective || 'Construção de Patrimônio e Aposentadoria',
      created_at: '2026-01-15T10:00:00Z',
    };
  },

  getPortfolio: async (clientId: string): Promise<ClientPortfolioData> => {
    const useMocks = env.mode === 'mock';

    if (!useMocks) {
      try {
        const raw = await request<Record<string, unknown>>(`/clients/${clientId}/portfolio`);
        return {
          client_id: String(raw.client_id ?? clientId),
          as_of: String(raw.as_of ?? new Date().toISOString()),
          total_value: (raw.total_value as number | string) ?? '1280000.00',
          cash_value: Number(raw.cash_value ?? 64000),
          cash_percentage: Number(raw.cash_percentage ?? 5.0),
          positions: (raw.positions as ClientPortfolioData['positions']) || [],
          allocation_by_class: (raw.allocation_by_class as ClientPortfolioData['allocation_by_class']) || [],
          institutions: (raw.institutions as ClientPortfolioData['institutions']) || [],
        };
      } catch (err) {
        console.warn(`Fallback para mock da carteira do cliente ${clientId}:`, err);
      }
    }

    const mockDetail = MOCK_CLIENTS.find((c) => c.id === clientId) || MOCK_CLIENTS[0];
    return createMockPortfolio(clientId, mockDetail.net_worth);
  },

  getAlerts: async (clientId: string): Promise<ClientAlertItem[]> => {
    return MOCK_ALERTS.map((a) => ({ ...a, client_id: clientId }));
  },

  getGoals: async (clientId: string): Promise<ClientGoalItem[]> => {
    return MOCK_GOALS.map((g) => ({ ...g, client_id: clientId }));
  },

  getInteractions: async (clientId: string): Promise<ClientInteractionItem[]> => {
    const useMocks = env.mode === 'mock';

    if (!useMocks) {
      try {
        const raw = await request<Record<string, unknown>>(`/clients/${clientId}/interactions`);
        const items = (raw.items as ClientInteractionItem[]) || [];
        if (items.length > 0) return items;
      } catch (err) {
        console.warn(`Fallback para mock de interações do cliente ${clientId}:`, err);
      }
    }

    return MOCK_INTERACTIONS_MAP[clientId] || MOCK_INTERACTIONS_MAP['11111111-1111-4111-8111-111111111111'];
  },

  createInteraction: async (clientId: string, payload: CreateInteractionPayload): Promise<ClientInteractionItem> => {
    const useMocks = env.mode === 'mock';

    const newInteraction: ClientInteractionItem = {
      id: `int-${Date.now()}`,
      client_id: clientId,
      channel: payload.channel,
      occurred_at: payload.occurred_at || new Date().toISOString(),
      summary: payload.summary,
      next_step: payload.next_step || null,
      advisor_name: 'Assessor XP',
    };

    if (!useMocks) {
      try {
        const res = await request<Record<string, unknown>>(`/clients/${clientId}/interactions`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return {
          id: String(res.id ?? newInteraction.id),
          client_id: clientId,
          channel: (res.channel as ClientInteractionItem['channel']) || newInteraction.channel,
          occurred_at: String(res.occurred_at ?? newInteraction.occurred_at),
          summary: String(res.summary ?? newInteraction.summary),
          next_step: res.next_step ? String(res.next_step) : newInteraction.next_step,
          advisor_name: String(res.advisor_name ?? newInteraction.advisor_name),
        };
      } catch (err) {
        console.warn('Erro ao persistir interação no backend, salvando em cache local:', err);
      }
    }

    if (!MOCK_INTERACTIONS_MAP[clientId]) {
      MOCK_INTERACTIONS_MAP[clientId] = [];
    }
    MOCK_INTERACTIONS_MAP[clientId].unshift(newInteraction);
    return newInteraction;
  },
};
