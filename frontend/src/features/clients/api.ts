import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';
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

export const MOCK_CLIENTS: ClientItem[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Mariana Costa',
    risk_profile: 'moderate',
    net_worth: 1280000,
    institutions_count: 3,
    active_alerts_count: 2,
    city: 'Campinas · SP',
    primary_objective: 'Aposentadoria em 2045',
    next_contact_date: '14/10/2026',
    email: 'mariana.costa@example.test',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Ricardo Almeida',
    risk_profile: 'conservative',
    net_worth: 740000,
    institutions_count: 2,
    active_alerts_count: 1,
    city: 'Ribeirão Preto · SP',
    primary_objective: 'Proteção patrimonial',
    next_contact_date: '15/10/2026',
    email: 'ricardo.almeida@example.test',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Fernanda Lima',
    risk_profile: 'aggressive',
    net_worth: 2420000,
    institutions_count: 4,
    active_alerts_count: 0,
    city: 'Toledo · PR',
    primary_objective: 'Crescimento de longo prazo',
    next_contact_date: '16/10/2026',
    email: 'fernanda.lima@example.test',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Carlos Rocha',
    risk_profile: 'moderate',
    net_worth: 890000,
    institutions_count: 3,
    active_alerts_count: 1,
    city: 'São Carlos · SP',
    primary_objective: 'Compra de imóvel',
    next_contact_date: '17/10/2026',
    email: 'carlos.rocha@example.test',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Ana Martins',
    risk_profile: 'conservative',
    net_worth: 560000,
    institutions_count: 2,
    active_alerts_count: 0,
    city: 'Fortaleza · CE',
    primary_objective: 'Reserva e estabilidade',
    next_contact_date: '18/10/2026',
    email: 'ana.martins@example.test',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'João Ferreira',
    risk_profile: 'moderate',
    net_worth: 1930000,
    institutions_count: 3,
    active_alerts_count: 1,
    city: 'Londrina · PR',
    primary_objective: 'Independência financeira',
    next_contact_date: '21/10/2026',
    email: 'joao.ferreira@example.test',
  },
];

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

export const clientsApi = {
  list: async (params: ClientFilterParams = {}): Promise<ClientsListResponse> => {
    const useMocks = env.useMocks;
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 10;
    const query = (params.query ?? '').trim().toLowerCase();
    const risk = params.risk_profile ?? 'Todos';

    if (useMocks) {
      let filtered = [...MOCK_CLIENTS];

      if (query) {
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.city.toLowerCase().includes(query) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.primary_objective && c.primary_objective.toLowerCase().includes(query)),
        );
      }

      if (risk && risk !== 'Todos') {
        const targetRisk = normalizeRiskProfile(risk);
        filtered = filtered.filter((c) => normalizeRiskProfile(c.risk_profile) === targetRisk);
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const startIndex = (page - 1) * pageSize;
      const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

      return {
        items: paginatedItems,
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
      };
    }

    try {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set('search', query);
      if (risk && risk !== 'Todos') {
        searchParams.set('risk_profile', normalizeRiskProfileToContract(risk));
      }
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));

      const data = await request<Record<string, unknown>>(`/api/v1/clients?${searchParams.toString()}`);
      const rawItems = (data.items as Array<Record<string, unknown>>) || [];
      return {
        items: rawItems.map((item) => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? 'Cliente sem nome'),
          risk_profile: String(item.risk_profile ?? 'moderate'),
          net_worth: (item.net_worth as number | string) ?? '0.00',
          institutions_count: Number(item.institutions_count ?? 1),
          active_alerts_count: Number(item.active_alerts_count ?? 0),
          city: String(item.city ?? 'Brasil'),
          primary_objective: item.primary_objective ? String(item.primary_objective) : undefined,
          next_contact_date: item.next_contact_date ? String(item.next_contact_date) : undefined,
          email: item.email ? String(item.email) : undefined,
        })),
        page: Number(data.page ?? page),
        page_size: Number(data.page_size ?? pageSize),
        total: Number(data.total ?? 0),
        total_pages: Number(data.total_pages ?? 1),
      };
    } catch (err) {
      console.warn('Fallback para mock de clientes após erro na API:', err);
      return clientsApi.list({ ...params, page, page_size: pageSize });
    }
  },
};
