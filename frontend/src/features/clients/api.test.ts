import { describe, expect, it, vi } from 'vitest';
import { clientsApi, normalizeRiskProfile, normalizeRiskProfileToContract } from './api';
import { env } from '../../shared/config/env';

describe('clientsApi', () => {
  it('lists mock clients when no filters are provided', async () => {
    const res = await clientsApi.list();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.total).toBe(6);
    expect(res.page).toBe(1);
  });

  it('filters clients by search query matching name', async () => {
    const res = await clientsApi.list({ query: 'mariana' });
    expect(res.items.length).toBe(1);
    expect(res.items[0].name).toBe('Mariana Costa');
  });

  it('filters clients by search query matching city', async () => {
    const res = await clientsApi.list({ query: 'Toledo' });
    expect(res.items.length).toBe(1);
    expect(res.items[0].name).toBe('Fernanda Lima');
  });

  it('filters clients by suitability risk profile', async () => {
    const res = await clientsApi.list({ risk_profile: 'Conservador' });
    expect(res.items.length).toBe(2);
    expect(res.items.map((c) => c.name)).toEqual(['Ricardo Almeida', 'Ana Martins']);
  });

  it('filters clients by both query and risk profile simultaneously', async () => {
    const res = await clientsApi.list({ query: 'Carlos', risk_profile: 'Moderado' });
    expect(res.items.length).toBe(1);
    expect(res.items[0].name).toBe('Carlos Rocha');
  });

  it('returns empty list when no clients match query', async () => {
    const res = await clientsApi.list({ query: 'InexistenteXYZ' });
    expect(res.items.length).toBe(0);
    expect(res.total).toBe(0);
    expect(res.total_pages).toBe(1);
  });

  it('paginates clients correctly', async () => {
    const page1 = await clientsApi.list({ page: 1, page_size: 2 });
    expect(page1.items.length).toBe(2);
    expect(page1.page).toBe(1);
    expect(page1.total_pages).toBe(3);

    const page2 = await clientsApi.list({ page: 2, page_size: 2 });
    expect(page2.items.length).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.items[0].name).not.toBe(page1.items[0].name);
  });

  it('fetches client 360 detail by id', async () => {
    const client = await clientsApi.getById('11111111-1111-4111-8111-111111111111');
    expect(client).toBeDefined();
    expect(client.name).toBe('Mariana Costa');
    expect(client.preferences).toBeDefined();
    expect(client.preferences?.preferred_channel).toContain('WhatsApp');
    expect(client.suitability_expires_at).toBeDefined();
  });

  it('fetches client portfolio with asset classes and institutions', async () => {
    const portfolio = await clientsApi.getPortfolio('11111111-1111-4111-8111-111111111111');
    expect(portfolio).toBeDefined();
    expect(portfolio.positions.length).toBeGreaterThan(0);
    expect(portfolio.allocation_by_class.length).toBeGreaterThan(0);
    expect(portfolio.institutions.length).toBeGreaterThan(0);
    expect(portfolio.cash_value).toBeGreaterThan(0);
  });

  it('fetches alerts and goals for client', async () => {
    const alerts = await clientsApi.getAlerts('11111111-1111-4111-8111-111111111111');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].reason_type).toBeDefined();

    const goals = await clientsApi.getGoals('11111111-1111-4111-8111-111111111111');
    expect(goals.length).toBeGreaterThan(0);
    expect(goals[0].name).toBeDefined();
    expect(goals[0].progress_percentage).toBeGreaterThan(0);
  });

  it('fetches interactions and allows creating a new interaction', async () => {
    const originalMode = env.mode;
    env.mode = 'local';
    const items: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/login')) return Response.json({ access_token: 'test-token' });
      if (url.endsWith('/interactions') && init?.method === 'POST') {
        const created = { id: 'int-test', client_id: '11111111-1111-4111-8111-111111111111', ...JSON.parse(String(init.body)) };
        items.unshift(created);
        return Response.json(created);
      }
      if (url.endsWith('/interactions')) return Response.json({ items });
      throw new Error(`URL inesperada: ${url}`);
    }));
    try {
      const clientId = '11111111-1111-4111-8111-111111111111';
      expect(await clientsApi.getInteractions(clientId)).toEqual([]);
      const created = await clientsApi.createInteraction(clientId, {
        channel: 'meeting',
        summary: 'Reunião de alinhamento com nova alocação',
        next_step: 'Enviar proposta formal',
      });
      expect(created.id).toBe('int-test');
      expect(created.summary).toBe('Reunião de alinhamento com nova alocação');
      expect((await clientsApi.getInteractions(clientId))[0].id).toBe(created.id);
    } finally {
      env.mode = originalMode;
      vi.unstubAllGlobals();
    }
  });

  it('sends a meeting attachment as multipart data with authorization', async () => {
    const originalMode = env.mode;
    env.mode = 'local';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/auth/login')) return Response.json({ access_token: 'test-token' });
      expect(String(input)).toContain('/interactions/upload');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
      expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.get('channel')).toBe('meeting');
      expect(form.get('file')).toBeInstanceOf(File);
      return Response.json({
        id: 'int-upload', client_id: '11111111-1111-4111-8111-111111111111',
        channel: 'meeting', summary: 'Ata', transcription: 'Texto da ata',
        attachment_name: 'ata.txt', attachment_type: 'minutes',
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const result = await clientsApi.uploadInteraction(
        '11111111-1111-4111-8111-111111111111',
        { channel: 'meeting', summary: 'Ata' },
        new File(['Texto da ata'], 'ata.txt', { type: 'text/plain' }),
      );
      expect(result.transcription).toBe('Texto da ata');
    } finally {
      env.mode = originalMode;
      vi.unstubAllGlobals();
    }
  });
});

describe('risk profile normalization utilities', () => {
  it('normalizes risk profile names to user display format', () => {
    expect(normalizeRiskProfile('conservative')).toBe('Conservador');
    expect(normalizeRiskProfile('moderate')).toBe('Moderado');
    expect(normalizeRiskProfile('aggressive')).toBe('Arrojado');
    expect(normalizeRiskProfile('Conservador')).toBe('Conservador');
  });

  it('normalizes risk profile names to API contract format', () => {
    expect(normalizeRiskProfileToContract('Conservador')).toBe('conservative');
    expect(normalizeRiskProfileToContract('Moderado')).toBe('moderate');
    expect(normalizeRiskProfileToContract('Arrojado')).toBe('aggressive');
  });
});

