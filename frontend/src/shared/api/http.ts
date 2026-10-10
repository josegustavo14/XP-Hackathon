import { env } from '../config/env';
import type { ApiErrorPayload } from './generated';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.error?.code;
    this.details = payload?.error?.details;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // A resposta pode estar vazia ou não ser JSON.
    }
    throw new ApiError(payload?.error?.message ?? 'Não foi possível concluir a solicitação.', response.status, payload);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
