import { env } from '../config/env';
import type { ApiErrorPayload } from './generated';

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

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(env.accessToken ? { Authorization: `Bearer ${env.accessToken}` } : {}),
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
