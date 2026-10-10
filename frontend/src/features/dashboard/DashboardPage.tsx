import { useCallback, useEffect, useState } from 'react';
import { dashboardApi } from './api';
import { formatMoney } from '../../shared/formatters/money';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/States';
import type { DashboardSummary } from '../../shared/api/generated';

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dashboardApi.summary().then(setData).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Erro inesperado.');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="Não há dados para exibir." />;

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Visão geral</p><h1>Dashboard do assessor</h1></div></div>
      <div className="metrics">
        <article><span>Clientes sob gestão</span><strong>{data.client_count}</strong></article>
        <article><span>Patrimônio acompanhado</span><strong>{formatMoney(data.managed_assets)}</strong></article>
        <article><span>Alertas ativos</span><strong>{data.open_alerts}</strong></article>
      </div>
      <div className="card"><h2>Atendimentos prioritários</h2>
        {data.priority_clients.length === 0 ? <EmptyState /> : <ul className="client-list">{data.priority_clients.map((client) => <li key={client.id}><div><strong>{client.name}</strong><span>{client.risk_profile}</span></div><b>{formatMoney(client.total_assets)}</b></li>)}</ul>}
      </div>
    </section>
  );
}
