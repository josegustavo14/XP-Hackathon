import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';
import type { CopilotChatRequest, CopilotChatResponse } from '../../shared/api/generated';

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;
}

function createMockResponse(payload: CopilotChatRequest): CopilotChatResponse {
  return {
    session_id: payload.session_id ?? createId(),
    message_id: createId(),
    answer: 'Os dados de demonstração indicam concentração em renda fixa para Mariana Costa. Há um alerta aberto para revisar essa exposição com a cliente.',
    sources: [
      {
        type: 'alert',
        id: '00000000-0000-0000-0000-000000002001',
        label: 'Concentração em renda fixa',
        updated_at: '2026-10-10T09:00:00Z',
      },
    ],
    suggested_actions: [
      {
        type: 'open_client',
        label: 'Abrir Mariana Costa',
        target_id: '00000000-0000-0000-0000-000000000001',
      },
    ],
    disclaimer: 'Conteúdo de apoio sujeito à revisão do assessor.',
  };
}

export const copilotApi = {
  chat: (payload: CopilotChatRequest) => (env.mode === 'mock'
    ? Promise.resolve(createMockResponse(payload))
    : request<CopilotChatResponse>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })),
};