import { describe, expect, it } from 'vitest';

import { resolveApiConfig } from './env';

describe('resolveApiConfig', () => {
  it('mantém mocks como padrão compatível', () => {
    expect(resolveApiConfig({})).toMatchObject({
      mode: 'mock',
      apiBaseUrl: 'http://localhost:8000/api/v1',
    });
  });

  it('seleciona a URL local sem alterar as features', () => {
    expect(resolveApiConfig({
      VITE_API_MODE: 'local',
      VITE_API_LOCAL_BASE_URL: 'http://localhost:8000/api/v1/',
    })).toMatchObject({ mode: 'local', apiBaseUrl: 'http://localhost:8000/api/v1' });
  });

  it('seleciona URL e token para a API remota', () => {
    expect(resolveApiConfig({
      VITE_API_MODE: 'remote',
      VITE_API_REMOTE_BASE_URL: 'https://api.demo.example/api/v1/',
      VITE_API_ACCESS_TOKEN: 'demo-token',
    })).toMatchObject({
      mode: 'remote',
      apiBaseUrl: 'https://api.demo.example/api/v1',
      accessToken: 'demo-token',
    });
  });
});
