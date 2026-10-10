import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import type { NewsItem } from '../../../shared/api/generated';

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

export const MarketIntelligence: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    dashboardApi
      .news(period)
      .then((res) => {
        if (isMounted) setNews(res.items || []);
      })
      .catch((err) => {
        console.warn('Erro ao carregar notícias:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [period]);

  return (
    <Card className="news-panel">
      <div className="sectionhead">
        <div>
          <h2>Inteligência de mercado</h2>
          <p>Resumo dos principais acontecimentos para apoiar o assessor (EP08)</p>
        </div>
        <div className="news-controls">
          <button
            type="button"
            className={`news-tab ${period === 'day' ? 'selected' : ''}`}
            onClick={() => setPeriod('day')}
          >
            Hoje
          </button>
          <button
            type="button"
            className={`news-tab ${period === 'week' ? 'selected' : ''}`}
            onClick={() => setPeriod('week')}
          >
            Semana
          </button>
        </div>
      </div>

      <div className="news-meta">
        Feed integrado de inteligência macroeconômica e ativos relevantes para o atendimento.
      </div>

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)' }}>
          Carregando inteligência de mercado...
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
                <span className="news-meta">{item.source_name}</span>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link"
                    style={{ fontSize: 11 }}
                  >
                    Ler fonte ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="news-disclaimer">
        Monitoramento informativo. O assessor deve verificar adequação ao suitability do cliente antes de qualquer orientação.
      </p>
    </Card>
  );
};
