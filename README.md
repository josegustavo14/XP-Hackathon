# XP Advisor

Frontend React + TypeScript preparado para desenvolvimento contract-first em paralelo ao backend.

## Desenvolvimento

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O `.env` usa `VITE_USE_MOCKS=true` por padrão. Para apontar para o backend, defina `VITE_USE_MOCKS=false` e ajuste `VITE_API_BASE_URL`.

As chamadas passam pelos módulos de cada feature (`src/features/*/api.ts`) e usam o cliente HTTP compartilhado. Componentes de tela não conhecem URLs. Os tipos em `src/shared/api/generated.ts` são o ponto de consumo do contrato OpenAPI e podem ser substituídos pelo arquivo gerado quando o schema for versionado.

## Estrutura

- `frontend/src/app`: composição da aplicação e rotas.
- `frontend/src/features`: APIs e telas por domínio.
- `frontend/src/shared/api`: cliente HTTP, erros e tipos de contrato.
- `frontend/src/shared/ui`: estados comuns e tratamento global de erro.
- `frontend/src/shared/formatters`: formatação de valores recebidos como string decimal.
