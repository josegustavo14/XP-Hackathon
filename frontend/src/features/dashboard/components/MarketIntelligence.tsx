import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import type { NewsItem, NewsResponse } from '../../../shared/api/generated';

interface MarketIntelligenceProps {
  clientId?: string;
  clientName?: string;
}

const formatNewsDate = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Recente';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatUpdatedAt = (dateString?: string) => {
  if (!dateString) return 'Atualização indisponível';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Atualização indisponível';
  return `Atualizado às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ clientId, clientName }) => {
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [feed, setFeed] = useState<NewsResponse>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(undefined);

    dashboardApi
      .news(period, clientId)
      .then((res) => {
        if (!isMounted) return;
        setFeed(res);
        setNews(res.items || []);
      })
      .catch(() => {
        if (isMounted) setError('Não foi possível atualizar as notícias agora.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [period, clientId]);

  return (
    <Card className="news-panel">
      <div className="sectionhead">
        <div>
          <h2>Inteligência de mercado</h2>
          <p>
            {clientName
              ? `Notícias relevantes para ${clientName}`
              : 'Resumo dos principais acontecimentos para apoiar o assessor'}
          </p>
        </div>
        <div className="news-controls">
          <button
            type="button"
            className={`news-tab ${period === 'day' ? 'selected' : ''}`}
            onClick={() => setPeriod('day')}
            aria-pressed={period === 'day'}
          >
            Hoje
          </button>
          <button
            type="button"
            className={`news-tab ${period === 'week' ? 'selected' : ''}`}
            onClick={() => setPeriod('week')}
            aria-pressed={period === 'week'}
          >
            Semana
          </button>
        </div>
      </div>

      <div className="news-status" aria-live="polite">
        <span className="news-status-dot" aria-hidden="true" />
        {loading ? 'Atualizando feed…' : formatUpdatedAt(feed?.as_of)}
        {clientName && <span className="news-context">Contexto do cliente ativo</span>}
      </div>

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)' }}>
          Carregando inteligência de mercado...
        </div>
      ) : error ? (
        <div className="news-empty" role="status">
          <b>Feed temporariamente indisponível</b>
          <p>{error}</p>
        </div>
      ) : news.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)' }}>
          Nenhuma notícia disponível para este período.
        </div>
      ) : (
        <div className="news-list">
          {news.map((item) => (
            <article key={item.id} className="news-item">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Badge variant="blue">{item.topic || 'Mercado'}</Badge>
                <span className="news-meta">{formatNewsDate(item.published_at)}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="news-foot">
                <span className="news-meta">Fonte: {item.source_name}</span>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link"
                    style={{ fontSize: 11 }}
                  >
                    Abrir fonte original ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="news-disclaimer">
        Conteúdo exclusivamente informativo. Verifique a fonte original e a adequação ao perfil do
        cliente antes de qualquer orientação.
      </p>
    </Card>
  );
};
