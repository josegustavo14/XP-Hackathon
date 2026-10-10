# XP Advisor

Frontend React + TypeScript preparado para desenvolvimento contract-first em paralelo ao backend.

## Desenvolvimento

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Alternar entre mock, API local e API remota

Os componentes chamam somente APIs por feature. A seleção acontece por ambiente, sem alterar as telas:

| Cenário | Arquivo | Comando |
| --- | --- | --- |
| Mocks | `.env` com `VITE_API_MODE=mock` | `npm run dev` |
| FastAPI local | copie `.env.local.example` para `.env.local` | `npm run dev` |
| API remota | copie `.env.remote.example` para `.env.remote.local` | `npm run dev:remote` |

Para usar uma API protegida, preencha `VITE_API_ACCESS_TOKEN` no arquivo local do ambiente. Obtenha-o com `POST /api/v1/auth/login`; não envie tokens, URLs privadas, chaves do Supabase ou segredos no Git. Quando você tiver a URL pública do backend e um token de demonstração, envie apenas onde cada valor deve ser colocado e eu confirmo a configuração.

O backend atual ainda não expõe `/dashboard/summary` ou endpoints de clientes. Quando essas features forem publicadas, o dashboard passa a consumi-las automaticamente nos modos `local` e `remote`; até lá, mantenha `VITE_API_MODE=mock` para a tela funcional.

As chamadas passam pelos módulos de cada feature (`src/features/*/api.ts`) e usam o cliente HTTP compartilhado. Componentes de tela não conhecem URLs. Os tipos em `src/shared/api/generated.ts` são o ponto de consumo do contrato OpenAPI e podem ser substituídos pelo arquivo gerado quando o schema for versionado.

## Estrutura

- `frontend/src/app`: composição da aplicação e rotas.
- `frontend/src/features`: APIs e telas por domínio.
- `frontend/src/shared/api`: cliente HTTP, erros e tipos de contrato.
- `frontend/src/shared/ui`: estados comuns e tratamento global de erro.
- `frontend/src/shared/formatters`: formatação de valores recebidos como string decimal.
