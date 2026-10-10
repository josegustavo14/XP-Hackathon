import { describe, expect, it } from 'vitest';
import { clientsApi, normalizeRiskProfile, normalizeRiskProfileToContract } from './api';

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
