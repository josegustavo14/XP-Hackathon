import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from './api';
import { formatMoney } from '../../shared/formatters/money';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/States';
import { PageHeader } from '../../shared/ui/PageHeader';
import { MetricCard } from '../../shared/ui/MetricCard';
import { Card, SectionHead } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import type { DashboardSummary } from '../../shared/api/generated';

const getRiskBadgeVariant = (risk: string) => {
  switch (risk) {
    case 'conservative':
      return 'blue';
    case 'moderate':
      return 'gold';
    case 'aggressive':
      return 'green';
    default:
      return 'slate';
  }
};

const getRiskLabel = (risk: string) => {
  switch (risk) {
    case 'conservative':
      return 'Conservador';
    case 'moderate':
      return 'Moderado';
    case 'aggressive':
      return 'Arrojado';
    default:
      return risk;
  }
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dashboardApi
      .summary()
      .then(setData)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Erro inesperado.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="Não há dados para exibir." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        kicker="Visão geral"
        title="Bom dia, assessor"
        lead="Acompanhe sua base e comece pelas situações mais relevantes."
        action={
          <Button variant="primary" onClick={() => navigate('/copilot')}>
            ✦ Perguntar ao copiloto
          </Button>
        }
      />

      {/* Grid de 4 Métricas Principais */}
      <div className="grid4">
        <MetricCard
          label="Clientes sob gestão"
          value={data.client_count}
          foot="Base ativa de investidores"
        />
        <MetricCard
          label="Precisam de atenção"
          value={data.priority_clients.length}
          foot="Com alertas ou revisões pendentes"
        />
        <MetricCard
          label="Alertas em aberto"
          value={data.open_alerts}
          foot="Priorizados por gravidade"
        />
        <MetricCard
          label="Patrimônio sob gestão"
          value={formatMoney(data.managed_assets)}
          foot="Total consolidado da carteira"
        />
      </div>

      {/* Seção Principal: Atendimentos Prioritários */}
      <div className="split">
        <Card>
          <SectionHead
            title="Prioridades de atendimento"
            description="Situações identificadas pelo motor de riscos e oportunidades"
            action={
              <Button variant="secondary" onClick={() => navigate('/alerts')}>
                Ver todos os alertas
              </Button>
            }
          />

          {data.priority_clients.length === 0 ? (
            <EmptyState message="Nenhum atendimento prioritário pendente." />
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Perfil de Suitability</th>
                    <th>Patrimônio Total</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priority_clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <strong>{client.name}</strong>
                      </td>
                      <td>
                        <Badge variant={getRiskBadgeVariant(client.risk_profile)}>
                          {getRiskLabel(client.risk_profile)}
                        </Badge>
                      </td>
                      <td>
                        <strong>{formatMoney(client.total_assets)}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="link"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          Abrir perfil →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Card Lateral de Apoio Rápido */}
        <Card>
          <SectionHead
            title="Atalhos do copiloto"
            description="Ações rápidas para a sua rotina"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', background: '#f5f7f9', borderRadius: 9 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                ✦ Preparar briefing do dia
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                Gere resumos consolidados com pautas e alertas para reuniões.
              </p>
              <div style={{ marginTop: 10 }}>
                <Button variant="primary" onClick={() => navigate('/briefings')}>
                  Ir para Briefings →
                </Button>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#f5f7f9', borderRadius: 9 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                ◎ Base de clientes
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                Pesquise e filtre investidores por objetivos e carteira.
              </p>
              <div style={{ marginTop: 10 }}>
                <Button variant="secondary" onClick={() => navigate('/clients')}>
                  Buscar clientes →
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
