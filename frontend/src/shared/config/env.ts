export type ApiMode = 'mock' | 'local' | 'remote';

export interface ApiConfig {
  mode: ApiMode;
  apiBaseUrl: string;
  accessToken?: string;
}

type RuntimeEnv = Pick<
  ImportMetaEnv,
  | 'VITE_API_MODE'
  | 'VITE_API_BASE_URL'
  | 'VITE_API_LOCAL_BASE_URL'
  | 'VITE_API_REMOTE_BASE_URL'
  | 'VITE_API_ACCESS_TOKEN'
  | 'VITE_USE_MOCKS'
>;

const DEFAULT_LOCAL_URL = 'http://localhost:8000/api/v1';

function normalizeUrl(value: string | undefined): string {
  return value?.trim().replace(/\/$/, '') ?? '';
}

export function resolveApiConfig(values: RuntimeEnv): ApiConfig {
  const legacyMode = values.VITE_USE_MOCKS?.toLowerCase() === 'false' ? 'local' : 'mock';
  const configuredMode = values.VITE_API_MODE?.toLowerCase() || legacyMode;

  if (!['mock', 'local', 'remote'].includes(configuredMode)) {
    throw new Error('VITE_API_MODE deve ser mock, local ou remote.');
  }

  const mode = configuredMode as ApiMode;
  const apiBaseUrl = mode === 'remote'
    ? normalizeUrl(values.VITE_API_REMOTE_BASE_URL)
    : normalizeUrl(values.VITE_API_LOCAL_BASE_URL ?? values.VITE_API_BASE_URL ?? DEFAULT_LOCAL_URL);

  return {
    mode,
    apiBaseUrl,
    accessToken: values.VITE_API_ACCESS_TOKEN?.trim() || undefined,
  };
}

export const env = resolveApiConfig(import.meta.env);
