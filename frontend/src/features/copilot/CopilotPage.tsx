import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, RotateCcw, Send, Sparkles } from 'lucide-react';
import { copilotApi } from './api';
import type { CopilotChatResponse, CopilotSource } from '../../shared/api/generated';
import { Button } from '../../shared/ui/Button';
import { Card, SectionHead } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Badge } from '../../shared/ui/Badge';
import { ErrorState, LoadingState } from '../../shared/ui/States';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: CopilotChatResponse;
};

const suggestedPrompts = [
  'Quais clientes precisam de atenção?',
  'Quais são os vencimentos próximos?',
  'Quais clientes têm concentração?',
  'Resuma a situação da Mariana Costa',
];

function sourcePath(source: CopilotSource) {
  if (source.type === 'client') return `/clients/${encodeURIComponent(source.id)}`;
  if (source.type === 'alert') return `/alerts/${encodeURIComponent(source.id)}`;
  return undefined;
}

function formatSourceDate(value: string | null) {
  if (!value) return 'Data indisponível';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

function ChatResponseDetails({ response, onOpen }: { response: CopilotChatResponse; onOpen: (type: string, id: string) => void }) {
  return (
    <div className="copilot-response-details">
      {response.sources.length > 0 && (
        <div className="copilot-detail-group">
          <span className="copilot-detail-label">Fontes</span>
          <ul className="copilot-source-list">
            {response.sources.map((source) => {
              const path = sourcePath(source);
              return (
                <li key={`${source.type}-${source.id}`}>
                  {path
                    ? <button type="button" className="copilot-source-link" onClick={() => onOpen(source.type, source.id)}>{source.label}<ArrowUpRight size={13} /></button>
                    : <span className="copilot-source-name">{source.label}</span>}
                  <small>{source.type} · {formatSourceDate(source.updated_at)}</small>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {response.suggested_actions.length > 0 && (
        <div className="copilot-detail-group">
          <span className="copilot-detail-label">Ações sugeridas</span>
          <div className="copilot-action-list">
            {response.suggested_actions.map((action, index) => (
              action.type === 'open_client' || action.type === 'open_alert'
                ? <Button key={`${action.type}-${action.target_id}-${index}`} type="button" onClick={() => onOpen(action.type, action.target_id)}>{action.label}<ArrowUpRight size={14} /></Button>
                : <Badge key={`${action.type}-${action.target_id}-${index}`}>{action.label}</Badge>
            ))}
          </div>
        </div>
      )}

      <p className="copilot-disclaimer">{response.disclaimer}</p>
    </div>
  );
}

export function CopilotPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [failedMessage, setFailedMessage] = useState<string>();
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const clientId = searchParams.get('client_id');

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, error]);

  async function sendMessage(text: string, isRetry = false) {
    const message = text.trim();
    if (!message || loading) return;

    if (!isRetry) {
      setMessages((current) => [...current, {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
        role: 'user',
        content: message,
      }]);
      setDraft('');
      setFailedMessage(undefined);
    }
    setError(undefined);
    setLoading(true);

    try {
      const response = await copilotApi.chat({ session_id: sessionId, message, client_id: clientId });
      setSessionId(response.session_id);
      setMessages((current) => [...current, {
        id: response.message_id,
        role: 'assistant',
        content: response.answer,
        response,
      }]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar sua mensagem. Tente novamente.');
      setFailedMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function openResource(type: string, id: string) {
    if (type === 'client' || type === 'open_client') navigate(`/clients/${encodeURIComponent(id)}`);
    if (type === 'alert' || type === 'open_alert') navigate(`/alerts/${encodeURIComponent(id)}`);
  }

  function clearConversation() {
    setMessages([]);
    setSessionId(null);
    setError(undefined);
    setFailedMessage(undefined);
    setDraft('');
  }

  return (
    <div className="copilot-page">
      <PageHeader
        kicker="Inteligência aplicada"
        title="Copiloto IA"
        lead="Consulte os dados dos clientes usando linguagem natural e verifique as fontes."
      />

      <div className="copilot-stack">
        <Card className="copilot-conversation-card">
          <SectionHead
            title="Conversa com o assistente"
            description="Respostas produzidas para a base fictícia"
            action={<Badge variant="gold">Demonstração</Badge>}
          />

          <div className="copilot-transcript" aria-live="polite" aria-label="Histórico da conversa">
            {messages.length === 0 && !loading && (
              <div className="copilot-empty">
                <span className="copilot-empty-icon"><Sparkles size={21} /></span>
                <h2>Como posso ajudar hoje?</h2>
                <p>Faça perguntas sobre a carteira, alertas e relacionamento com os clientes.</p>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`copilot-message copilot-message-${message.role}`}>
                <p>{message.content}</p>
                {message.response && <ChatResponseDetails response={message.response} onOpen={openResource} />}
              </article>
            ))}

            {loading && <div className="copilot-loading"><LoadingState label="Copiloto consultando..." /></div>}
            {error && (
              <div className="copilot-error">
                <ErrorState message={error} onRetry={failedMessage ? () => void sendMessage(failedMessage, true) : undefined} />
              </div>
            )}
            <div ref={transcriptEnd} className="copilot-transcript-end" />
          </div>

          <form className="copilot-composer" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="copilot-message">Sua mensagem</label>
            <input
              id="copilot-message"
              className="field"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Pergunte sobre seus clientes..."
              disabled={loading}
            />
            <Button variant="primary" type="submit" disabled={loading || !draft.trim()} aria-label="Enviar mensagem" title="Enviar">
              <Send size={16} />
            </Button>
          </form>
        </Card>

        <Card className="copilot-suggestions-card">
          <SectionHead title="Perguntas sugeridas" description="Escolha uma consulta para testar o copiloto." />
          <div className="copilot-prompt-list">
            {suggestedPrompts.map((prompt) => (
              <Button key={prompt} type="button" className="copilot-prompt" disabled={loading} onClick={() => void sendMessage(prompt)}>
                <span>{prompt}</span><ArrowUpRight size={14} />
              </Button>
            ))}
          </div>
          <p className="copilot-notice">O copiloto consulta apenas o conjunto de dados fictício e explica as fontes. As respostas precisam ser revisadas pelo assessor.</p>
          <Button type="button" onClick={clearConversation} disabled={loading} className="copilot-clear-button">
            <RotateCcw size={14} /> Limpar conversa
          </Button>
        </Card>
      </div>
    </div>
  );
}