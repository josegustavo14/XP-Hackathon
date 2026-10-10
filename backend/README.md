# Backend

## Copiloto com LLM

O provider padrão é Groq Cloud, modelo `llama-3.1-8b-instant`, chamado pelo protocolo HTTP OpenAI-compatible usando HTTPX. O adapter implementa `LLMProvider`; a seleção ocorre por `LLM_PROVIDER`, sem SDK do provedor no domínio. `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_SECONDS`, `LLM_MAX_OUTPUT_TOKENS`, `LLM_MAX_TOOL_ROUNDS`, `LLM_MAX_TOOL_CALLS` e `LLM_SESSION_TTL_SECONDS` são configuráveis pelo ambiente.

Foi escolhido o plano gratuito para o MVP: inferência custa US$ 0 dentro das quotas gratuitas publicadas pelo Groq. Essas quotas variam por modelo/conta e podem mudar; os limites locais são 4.000 caracteres por pergunta, 20 mensagens de histórico (10 turnos), 1.024 tokens de saída por chamada, 3 rodadas e 6 execuções de tools por turno. O backend não faz retries automáticos. O projeto não aplica um orçamento monetário: use uma chave em conta sem billing habilitado se a exigência for custo zero. Consulte [modelos e limites](https://console.groq.com/docs/rate-limits) e [preços](https://groq.com/pricing/) antes de ampliar o tráfego.

O Groq documenta retenção padrão de dados de inferência por até 30 dias e opções de Zero Data Retention sujeitas à elegibilidade/configuração da conta. Não envie dados pessoais/financeiros reais até a política de privacidade e a elegibilidade para retenção zero serem aprovadas pela XP. Consulte [Your Data in GroqCloud](https://console.groq.com/docs/your-data).

O MVP mantém histórico em memória, isolado por assessor e cliente, por até uma hora; reinícios do processo apagam as conversas. Tools são uma allowlist local (`search_clients`, `list_open_alerts`) e só chamam services existentes, sob a sessão autenticada/RLS. O modelo nunca recebe conexão SQL. Fontes e ações são formadas exclusivamente dos registros retornados pelas tools; prompts sem registros verificáveis recebem uma resposta neutra. Perguntas, respostas, tools, fontes e modelo ficam registrados em `ai_logs`.

Para executar a suíte local, instale `requirements.txt` e `requirements-dev.txt` e rode `pytest` a partir desta pasta.