# XP Advisor

Frontend React + TypeScript e backend FastAPI preparados para desenvolvimento contract-first.

## Demonstração local completa

O modo demonstrativo sobe o FastAPI com dados sintéticos persistidos em um PostgreSQL
local. Não requer Supabase, Open Finance ou chave de LLM.

Em um terminal, na raiz do repositório:

```bash
docker compose -f compose.demo.yml up --build
```

Em outro terminal:

```bash
cd frontend
npm ci
npm run dev
```

O frontend local usa `VITE_API_MODE=local` e inicia uma sessão de demonstração
automaticamente. Abra a URL exibida pelo Vite. A documentação da API fica em
`http://localhost:8000/docs`.

O Compose cria um PostgreSQL local na porta `54322`, aplica
`database/demo_seed.sql` em um volume novo e mantém interações criadas pela
interface nesse banco. Para reiniciar os dados sintéticos, execute
`docker compose -f compose.demo.yml down -v` e suba novamente.

Em **Registrar Interação**, é possível escrever um resumo, anexar uma ata `.txt`/`.md`
em UTF-8 ou `.pdf` com texto selecionável (sem senha, até 100 páginas), ou enviar áudio/vídeo `.mp3`, `.m4a`, `.wav`, `.ogg`, `.aac`, `.flac`, `.mp4`, `.mov` ou
`.webm` (até 25 MB e 30 minutos para gravações). O backend transcreve a fala em
português localmente com Whisper, salva o texto e o arquivo original no PostgreSQL
e mostra ambos no histórico do cliente. O modelo é baixado durante a primeira
construção da imagem Docker; a transcrição em CPU pode demorar alguns minutos.
O resumo e a ata não são gerados automaticamente pela IA. O histórico ainda não
alimenta o copiloto nem os briefings.

## Alternar entre mock, API local e API remota

Os componentes chamam somente APIs por feature. A seleção acontece por ambiente, sem alterar as telas:

| Cenário | Arquivo | Comando |
| --- | --- | --- |
| Mocks | `.env` com `VITE_API_MODE=mock` | `npm run dev` |
| FastAPI local | copie `.env.local.example` para `.env.local` | `npm run dev` |
| API remota | copie `.env.remote.example` para `.env.remote.local` | `npm run dev:remote` |

Para usar uma API protegida fora do modo demonstrativo, preencha `VITE_API_ACCESS_TOKEN` no arquivo local do ambiente. Não envie tokens, URLs privadas, chaves do Supabase ou segredos no Git.

No modo demonstrativo, o FastAPI expõe dashboard, clientes, perfil, carteira,
interações, alertas, briefings, notícias, fontes integradas e copiloto com dados
sintéticos. As integrações persistidas e os serviços externos continuam fora
deste modo.

As chamadas passam pelos módulos de cada feature (`src/features/*/api.ts`) e usam o cliente HTTP compartilhado. Componentes de tela não conhecem URLs. Os tipos em `src/shared/api/generated.ts` são o ponto de consumo do contrato OpenAPI e podem ser substituídos pelo arquivo gerado quando o schema for versionado.

## Estrutura

- `frontend/src/app`: composição da aplicação e rotas.
- `frontend/src/features`: APIs e telas por domínio.
- `frontend/src/shared/api`: cliente HTTP, erros e tipos de contrato.
- `frontend/src/shared/ui`: estados comuns e tratamento global de erro.
- `frontend/src/shared/formatters`: formatação de valores recebidos como string decimal.
