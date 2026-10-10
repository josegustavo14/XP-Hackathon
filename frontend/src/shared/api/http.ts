import { env } from '../config/env';
import type { ApiErrorPayload } from './generated';

let demoAccessToken: string | undefined;

async function getAccessToken(): Promise<string | undefined> {
  if (env.accessToken) return env.accessToken;
  if (env.mode !== 'local') return undefined;
  if (demoAccessToken) return demoAccessToken;

  const response = await fetch(`${env.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'assessor@demo.com', password: 'string' }),
  });
  if (!response.ok) throw new ApiConfigurationError('Não foi possível iniciar a sessão demonstrativa da API local.');
  const payload = await response.json() as { access_token: string };
  demoAccessToken = payload.access_token;
  return demoAccessToken;
}

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly traceId?: string;

  constructor(message: string, status: number, payload?: ApiErrorPayload, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.error?.code;
    this.details = payload?.error?.details;
    this.traceId = payload?.error?.trace_id ?? traceId;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new ApiConfigurationError(
      'Defina VITE_API_REMOTE_BASE_URL para usar a API remota.',
    );
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // A resposta pode estar vazia ou não ser JSON.
    }
    const traceId = response.headers.get('X-Trace-Id') ?? undefined;
    const error = new ApiError(
      payload?.error?.message ?? 'Não foi possível concluir a solicitação.',
      response.status,
      payload,
      traceId,
    );
    console.error('Falha na API', { path, status: error.status, code: error.code, traceId: error.traceId });
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
