import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ShieldCheck, Bell, Calendar, Sparkles, MessageSquarePlus, Bot } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { formatMoney } from '../../../shared/formatters/money';
import type { ClientDetailData, ClientAlertItem } from '../types';
import { normalizeRiskProfile } from '../api';

interface OverviewTabProps {
  client: ClientDetailData;
  alerts: ClientAlertItem[];
  onOpenInteractionModal: () => void;
  onGoToTab: (tabId: string) => void;
}

const formatWealth = (value: number | string): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return formatMoney(value);
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  client,
  alerts,
  onOpenInteractionModal,
  onGoToTab,
}) => {
  const navigate = useNavigate();

  const activeAlertsCount = alerts.filter((a) => a.status === 'pending').length;
  const normalizedRisk = normalizeRiskProfile(client.risk_profile);

  return (
    <div className="overview-tab-content">
      {/* Cards de Métricas Principais */}
      <div className="grid4">
        <Card className="metric-card">
          <div className="row justify-between">
            <span className="metric-label">Patrimônio Consolidado</span>
            <Wallet className="icon-gold" size={18} />
          </div>
          <div className="metric-value">{formatWealth(client.net_worth)}</div>
          <div className="metric-foot">
            {client.institutions_count} instituição(ões) conectadas
          </div>
        </Card>

        <Card className="metric-card">
          <div className="row justify-between">
            <span className="metric-label">Perfil de Risco (Suitability)</span>
            <ShieldCheck className="icon-blue" size={18} />
          </div>
          <div className="metric-value" style={{ fontSize: '22px', marginTop: '16px' }}>
            {normalizedRisk}
          </div>
          <div className="metric-foot">
            Válido até {client.suitability_expires_at || '2027'}
          </div>
        </Card>

        <Card className="metric-card">
          <div className="row justify-between">
            <span className="metric-label">Alertas Ativos</span>
            <Bell className={activeAlertsCount > 0 ? 'icon-red' : 'icon-green'} size={18} />
          </div>
          <div className="metric-value" style={{ color: activeAlertsCount > 0 ? '#bd504b' : '#1a805a' }}>
            {activeAlertsCount}
          </div>
          <div className="metric-foot">
            {activeAlertsCount > 0 ? 'Requer atenção do assessor' : 'Carteira em conformidade'}
          </div>
        </Card>

        <Card className="metric-card">
          <div className="row justify-between">
            <span className="metric-label">Próximo Contato</span>
            <Calendar className="icon-muted" size={18} />
          </div>
          <div className="metric-value" style={{ fontSize: '20px', marginTop: '16px' }}>
            {client.next_contact_at || '14/10/2026'}
          </div>
          <div className="metric-foot">
            Agendamento sugerido
          </div>
        </Card>
      </div>

      {/* Grid: Preferências do Cliente + Próximos Passos */}
      <div className="split section">
        <Card>
          <div className="sectionhead">
            <div>
              <h2>Objetivos e Perfil do Investidor</h2>
              <p>Preferências operacionais e horizonte de alocação</p>
            </div>
            <Badge variant="gold">{normalizedRisk}</Badge>
          </div>

          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <span className="detail-label">Objetivo Principal</span>
              <span className="detail-value">{client.primary_objective || 'Construção de Patrimônio'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">Horizonte Declarado</span>
              <span className="detail-value">
                {client.investment_horizon_yrs ? `${client.investment_horizon_yrs} anos` : 'Longo prazo (10+ anos)'}
              </span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">Necessidade de Liquidez</span>
              <span className="detail-value">{client.liquidity_need || 'Moderada'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">Canal Preferencial</span>
              <span className="detail-value">{client.preferences?.preferred_channel || 'WhatsApp / Reunião'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">Melhor Horário de Contato</span>
              <span className="detail-value">{client.preferences?.contact_period || 'Tarde (14h - 17h)'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">Cidade e Estado</span>
              <span className="detail-value">{client.city} {client.state ? `· ${client.state}` : ''}</span>
            </div>
          </div>

          {client.preferences?.notes && (
            <div className="profile-notes-box">
              <span className="notes-label">Observações do Assessor:</span>
              <p className="notes-text">{client.preferences.notes}</p>
            </div>
          )}
        </Card>

        <Card>
          <div className="sectionhead">
            <div>
              <h2>Ações Rápidas com IA</h2>
              <p>Ferramentas integradas para o assessor</p>
            </div>
          </div>

          <div className="quick-actions-list">
            <div className="quick-action-card">
              <div className="quick-action-info">
                <b>Gerar Briefing Inteligente</b>
                <p>Consolida pauta, alertas e histórico para sua próxima reunião.</p>
              </div>
              <Button
                variant="gold"
                className="btn-sm"
                onClick={() => navigate('/briefings')}
              >
                <Sparkles size={14} style={{ marginRight: '6px' }} />
                Briefing
              </Button>
            </div>

            <div className="quick-action-card">
              <div className="quick-action-info">
                <b>Consultar Copiloto IA</b>
                <p>Pergunte sobre alocação, notícias de mercado ou compliance do cliente.</p>
              </div>
              <Button
                variant="secondary"
                className="btn-sm"
                onClick={() => navigate('/copilot')}
              >
                <Bot size={14} style={{ marginRight: '6px' }} />
                Copiloto
              </Button>
            </div>

            <div className="quick-action-card">
              <div className="quick-action-info">
                <b>Registrar Novo Atendimento</b>
                <p>Atualize a memória e pendências combinadas com o cliente.</p>
              </div>
              <Button
                variant="primary"
                className="btn-sm"
                onClick={onOpenInteractionModal}
              >
                <MessageSquarePlus size={14} style={{ marginRight: '6px' }} />
                Registrar
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn-link"
              onClick={() => onGoToTab('memory')}
              style={{ fontSize: '12px' }}
            >
              Ver linha do tempo completa de atendimentos →
            </button>
          </div>
        </Card>
      </div>

      {/* Tabela de Alertas deste Cliente */}
      <Card className="section">
        <div className="sectionhead">
          <div>
            <h2>Alertas e Oportunidades Deste Cliente</h2>
            <p>Pontos de atenção identificados pelo motor de inteligência</p>
          </div>
          <Badge variant={activeAlertsCount > 0 ? 'red' : 'green'}>
            {activeAlertsCount} pendente(s)
          </Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="empty">
            <b>Nenhum alerta ativo</b>
            <p>A carteira deste cliente está sem pendências regulatórias ou desvios.</p>
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Severidade</th>
                  <th>Motivo do Alerta</th>
                  <th>Identificado em</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((al) => (
                  <tr key={al.id}>
                    <td>
                      <Badge
                        variant={
                          al.severity === 'high' ? 'red' : al.severity === 'medium' ? 'gold' : 'green'
                        }
                      >
                        {al.severity === 'high' ? 'Alta prioridade' : al.severity === 'medium' ? 'Média prioridade' : 'Informativo'}
                      </Badge>
                    </td>
                    <td>
                      <span className="strong">{al.reason_label}</span>
                    </td>
                    <td className="muted">
                      {new Date(al.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <Badge variant={al.status === 'pending' ? 'gold' : 'slate'}>
                        {al.status === 'pending' ? 'Pendente' : 'Resolvido'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="link"
                        onClick={() => navigate('/alerts')}
                      >
                        Ver análise →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
