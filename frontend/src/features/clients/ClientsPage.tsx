import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Card } from '../../shared/ui/Card';
import { ClientFilters } from './components/ClientFilters';
import { ClientTable } from './components/ClientTable';
import { ClientPagination } from './components/ClientPagination';
import { MarketIntelligence } from '../dashboard/components/MarketIntelligence';
import { clientsApi, type ClientItem } from './api';

export const ClientsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newsClientId, setNewsClientId] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    clientsApi
      .list({
        query,
        risk_profile: riskFilter,
        page,
        page_size: pageSize,
      })
      .then((res) => {
        if (!isMounted) return;
        setClients(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Erro ao listar clientes:', err);
        setError('Ocorreu um erro ao carregar os clientes. Tente novamente mais tarde.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query, riskFilter, page]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
  };

  const handleRiskFilterChange = (newRisk: string) => {
    setRiskFilter(newRisk);
    setPage(1);
  };

  const handleClearFilters = () => {
    setQuery('');
    setRiskFilter('Todos');
    setPage(1);
  };

  const isFiltered = Boolean(query.trim() || riskFilter !== 'Todos');
  const selectedNewsClient = clients.find((client) => client.id === newsClientId);

  return (
    <div className="clients-page-container">
      <PageHeader
        kicker="Base de clientes"
        title="Clientes"
        lead="Pesquise e acompanhe seus clientes em um único lugar."
      />

      <Card className="section">
        <div className="sectionhead">
          <div>
            <h2>
              Lista de clientes{' '}
              <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                ({total})
              </span>
            </h2>
            <p>Clientes vinculados à sua carteira de assessoria</p>
          </div>

          <ClientFilters
            query={query}
            onQueryChange={handleQueryChange}
            riskFilter={riskFilter}
            onRiskFilterChange={handleRiskFilterChange}
            onClear={handleClearFilters}
            isFiltered={isFiltered}
          />
        </div>

        {error ? (
          <div className="empty">
            <b>Falha ao carregar clientes</b>
            <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {error}
            </p>
          </div>
        ) : (
          <>
            <ClientTable clients={clients} loading={loading} />
            <ClientPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <div className="section">
        <div className="news-client-context">
          <label htmlFor="news-client">Contexto das notícias</label>
          <select
            id="news-client"
            className="select-field news-client-select"
            value={newsClientId}
            onChange={(event) => setNewsClientId(event.target.value)}
          >
            <option value="">Todos os clientes da carteira</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <p>Use um cliente da lista para consultar notícias relevantes ao seu contexto.</p>
        </div>
        <MarketIntelligence clientId={newsClientId || undefined} clientName={selectedNewsClient?.name} />
      </div>
    </div>
  );
};
