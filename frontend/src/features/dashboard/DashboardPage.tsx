import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from './api';
import { formatMoney } from '../../shared/formatters/money';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/States';
import { PageHeader } from '../../shared/ui/PageHeader';
import { MetricCard } from '../../shared/ui/MetricCard';
import { Card, SectionHead } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { MarketIntelligence } from './components/MarketIntelligence';
import { SuitabilityDistribution } from './components/SuitabilityDistribution';
import type { AlertPriority, DashboardPriorityItem, DashboardSummary, RiskProfile } from '../../shared/api/generated';

const getRiskBadgeVariant = (risk: RiskProfile | string) => {
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

const getRiskLabel = (risk: RiskProfile | string) => {
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

const getSeverityBadge = (severity: AlertPriority | string) => {
  switch (severity) {
    case 'high':
      return <Badge variant="red">Alta prioridade</Badge>;
    case 'medium':
      return <Badge variant="gold">Média prioridade</Badge>;
    case 'low':
      return <Badge variant="green">Baixa prioridade</Badge>;
    default:
      return <Badge variant="slate">{severity}</Badge>;
  }
};

export const DashboardPage: React.FC = () => {
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
        setError(reason instanceof Error ? reason.message : 'Erro inesperado ao carregar o dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="Não há dados para exibir no momento." />;

  // Normalização de dados para suportar tanto o contrato #9 quanto os mocks do EP00
  const totalClients = data.clients_total ?? data.client_count ?? 0;
  const totalAssets = data.total_assets ?? data.managed_assets ?? '0';
  const openAlerts = data.open_alerts ?? 0;

  // Normaliza lista de prioridades
  const priorities: DashboardPriorityItem[] =
    data.priorities ??
    (data.priority_clients?.map((pc) => ({
      client: {
        id: pc.id,
        name: pc.name,
        risk_profile: pc.risk_profile,
        total_assets: pc.total_assets,
      },
      reason_type: 'attention',
      reason_label: `Atenção prioritária (${pc.open_alerts} alerta(s))`,
      severity: (pc.attention_level === 'high' ? 'high' : 'medium') as AlertPriority,
      alert_id: null,
    })) || []);

  const needAttention = data.clients_need_attention ?? priorities.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cabeçalho da Página */}
      <PageHeader
        kicker="Visão geral"
        title="Bom dia, assessor"
        lead="Acompanhe sua base e comece pelas situações de maior relevância para o cliente."
        action={
          <Button variant="primary" onClick={() => navigate('/copilot')}>
            ✦ Perguntar ao copiloto
          </Button>
        }
      />

      {/* Grid de 4 Indicadores-Chave */}
      <div className="grid4">
        <MetricCard
          label="Clientes sob gestão"
          value={totalClients}
          foot="Base de investidores acompanhada"
        />
        <MetricCard
          label="Precisam de atenção"
          value={needAttention}
          foot="Com ocorrências priorizadas"
        />
        <MetricCard
          label="Alertas em aberto"
          value={openAlerts}
          foot="Monitorados pelas regras do motor"
        />
        <MetricCard
          label="Patrimônio sob gestão"
          value={formatMoney(totalAssets)}
          foot="Consolidado da carteira"
        />
      </div>

      {/* Bloco Central: Prioridades + Distribuição e Ações Rápidas */}
      <div className="split">
        {/* Tabela de Atendimentos Prioritários */}
        <Card>
          <SectionHead
            title="Prioridades de atendimento"
            description="Situações identificadas para contato proativo"
            action={
              <Button variant="secondary" onClick={() => navigate('/alerts')}>
                Ver central de alertas →
              </Button>
            }
          />

          {priorities.length === 0 ? (
            <EmptyState message="Nenhum atendimento prioritário no momento." />
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Suitability</th>
                    <th>Motivo da Ocorrência</th>
                    <th>Prioridade</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {priorities.map((item, idx) => (
                    <tr key={item.client.id || idx}>
                      <td>
                        <strong>{item.client.name}</strong>
                        {item.client.total_assets && (
                          <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                            {formatMoney(item.client.total_assets)}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge variant={getRiskBadgeVariant(item.client.risk_profile)}>
                          {getRiskLabel(item.client.risk_profile)}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.reason_label}</span>
                      </td>
                      <td>{getSeverityBadge(item.severity)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button
                          variant="link"
                          onClick={() => navigate(`/clients/${item.client.id}`)}
                        >
                          Abrir →
                        </Button>
                        {item.alert_id && (
                          <Button
                            variant="link"
                            style={{ marginLeft: 12, color: 'var(--muted)' }}
                            onClick={() => navigate(`/alerts/${item.alert_id}`)}
                          >
                            Alerta
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Coluna Direita: Distribuição da Base e Ações Rápidas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SuitabilityDistribution />

          <Card>
            <SectionHead
              title="Ações rápidas"
              description="Ferramentas para o seu dia"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button
                variant="primary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => navigate('/briefings')}
              >
                ▤ Preparar briefing de reunião
              </Button>
              <Button
                variant="secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => navigate('/clients')}
              >
                ◎ Consultar base de clientes
              </Button>
              <Button
                variant="secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => navigate('/finance')}
              >
                ◫ Visualizar dados consolidados
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bloco de Notícias e Inteligência de Mercado (EP08) */}
      <MarketIntelligence />
    </div>
  );
};
