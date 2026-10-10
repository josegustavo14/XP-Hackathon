import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquarePlus, Sparkles } from 'lucide-react';
import { PillTabs } from '../../shared/ui/PillTabs';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { LoadingState, ErrorState } from '../../shared/ui/States';
import { OverviewTab } from './components/OverviewTab';
import { PortfolioTab } from './components/PortfolioTab';
import { GoalsTab } from './components/GoalsTab';
import { InteractionsTimeline } from './components/InteractionsTimeline';
import { NewInteractionModal } from './components/NewInteractionModal';
import { MarketIntelligence } from '../dashboard/components/MarketIntelligence';
import { clientsApi, normalizeRiskProfile } from './api';
import type {
  ClientDetailData,
  ClientPortfolioData,
  ClientAlertItem,
  ClientGoalItem,
  ClientInteractionItem,
  CreateInteractionPayload,
} from './types';

export const ClientProfilePage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [client, setClient] = useState<ClientDetailData | null>(null);
  const [portfolio, setPortfolio] = useState<ClientPortfolioData | null>(null);
  const [alerts, setAlerts] = useState<ClientAlertItem[]>([]);
  const [goals, setGoals] = useState<ClientGoalItem[]>([]);
  const [interactions, setInteractions] = useState<ClientInteractionItem[]>([]);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState<boolean>(false);

  const loadClientData = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError(null);

      const [detailRes, portfolioRes, alertsRes, goalsRes, interactionsRes] =
        await Promise.all([
          clientsApi.getById(clientId),
          clientsApi.getPortfolio(clientId),
          clientsApi.getAlerts(clientId),
          clientsApi.getGoals(clientId),
          clientsApi.getInteractions(clientId),
        ]);

      setClient(detailRes);
      setPortfolio(portfolioRes);
      setAlerts(alertsRes);
      setGoals(goalsRes);
      setInteractions(interactionsRes);
    } catch (err) {
      console.error('Erro ao carregar dados do perfil 360 do cliente:', err);
      setError('Não foi possível carregar as informações do cliente.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  const handleSaveInteraction = async (payload: CreateInteractionPayload, file?: File) => {
    if (!clientId) return;
    const newInt = file
      ? await clientsApi.uploadInteraction(clientId, payload, file)
      : await clientsApi.createInteraction(clientId, payload);
    setInteractions((prev) => [newInt, ...prev]);
  };

  const handleAddGoal = (newGoal: Omit<ClientGoalItem, 'id' | 'client_id'>) => {
    if (!clientId) return;
    const created: ClientGoalItem = {
      ...newGoal,
      id: `goal-${Date.now()}`,
      client_id: clientId,
    };
    setGoals((prev) => [...prev, created]);
  };

  if (loading) {
    return <LoadingState label="Carregando perfil 360º e dados patrimoniais do investidor..." />;
  }

  if (error || !client) {
    return (
      <ErrorState
        message={error || 'Cliente não encontrado.'}
        onRetry={loadClientData}
      />
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'portfolio', label: 'Carteira Consolidada' },
    { id: 'goals', label: `Objetivos (${goals.length})` },
    { id: 'memory', label: `Histórico (${interactions.length})`, count: interactions.length },
  ];

  const normalizedRisk = normalizeRiskProfile(client.risk_profile);

  return (
    <div className="client-profile-page">
      {/* Botão de retorno */}
      <div className="mb-3">
        <button
          type="button"
          className="btn-back"
          onClick={() => navigate('/clients')}
        >
          <ArrowLeft size={14} style={{ marginRight: '6px' }} />
          Voltar para listagem de clientes
        </button>
      </div>

      {/* Header do Cliente 360 */}
      <div className="client-profile-header mb-4">
        <div className="row justify-between align-center">
          <div>
            <div className="kicker">Perfil 360º do Investidor</div>
            <div className="client-name-title-row">
              <h1 className="client-name-title">{client.name}</h1>
              <Badge variant="gold">{normalizedRisk}</Badge>
              {alerts.length > 0 && (
                <Badge variant="red">{alerts.length} alerta(s) ativo(s)</Badge>
              )}
            </div>
            <p className="lead" style={{ margin: '4px 0 0' }}>
              {client.city} {client.state ? `· ${client.state}` : ''} •{' '}
              <span className="text-muted">
                {client.institutions_count} instituição(ões) conectadas
              </span>{' '}
              • {client.email}
            </p>
          </div>

          <div className="client-header-actions">
            <Button
              variant="secondary"
              onClick={() => navigate('/briefings')}
              className="mr-2"
            >
              <Sparkles size={14} style={{ marginRight: '6px' }} />
              Gerar Briefing
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsInteractionModalOpen(true)}
            >
              <MessageSquarePlus size={14} style={{ marginRight: '6px' }} />
              Registrar Interação
            </Button>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="mb-4">
        <PillTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId)}
        />
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'overview' && (
        <>
          <OverviewTab
            client={client}
            alerts={alerts}
            onOpenInteractionModal={() => setIsInteractionModalOpen(true)}
            onGoToTab={(tabId) => setActiveTab(tabId)}
          />
          <MarketIntelligence clientId={client.id} clientName={client.name} />
        </>
      )}

      {activeTab === 'portfolio' && portfolio && (
        <PortfolioTab
          portfolio={portfolio}
          onNavigateFinance={() => navigate('/finance')}
        />
      )}

      {activeTab === 'goals' && (
        <GoalsTab
          goals={goals}
          onAddGoal={handleAddGoal}
        />
      )}

      {activeTab === 'memory' && (
        <InteractionsTimeline
          interactions={interactions}
          onOpenNewModal={() => setIsInteractionModalOpen(true)}
        />
      )}

      {/* Modal de Registro de Interação */}
      <NewInteractionModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        onSave={handleSaveInteraction}
        clientName={client.name}
      />
    </div>
  );
};
