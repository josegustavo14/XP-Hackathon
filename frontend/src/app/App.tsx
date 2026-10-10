import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from '../shared/layout/AppLayout';
import { PageHeader } from '../shared/ui/PageHeader';
import { Card } from '../shared/ui/Card';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ClientsPage } from '../features/clients/ClientsPage';
import { MarketIntelligence } from '../features/dashboard/components/MarketIntelligence';
import '../styles.css';

function FeaturePlaceholder({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <div>
      <PageHeader kicker={kicker} title={title} lead={description} />
      <Card>
        <div className="empty">
          <b>Funcionalidade em desenvolvimento</b>
          <p>Esta seção será implementada nas próximas etapas do projeto.</p>
        </div>
      </Card>
    </div>
  );
}

function ClientDetailPlaceholder() {
  const { clientId } = useParams<{ clientId: string }>();
  return (
    <div>
      <PageHeader
        kicker="Perfil 360º"
        title={`Cliente #${clientId}`}
        lead="Visualização consolidada do investidor, carteira e histórico de relacionamento."
      />
      <MarketIntelligence clientId={clientId} />
    </div>
  );
}

function AlertDetailPlaceholder() {
  const { alertId } = useParams<{ alertId: string }>();
  return (
    <FeaturePlaceholder
      kicker="Monitoramento"
      title={`Alerta #${alertId}`}
      description="Detalhamento da ocorrência, evidências dos dados e ações sugeridas."
    />
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Rota principal: Dashboard */}
          <Route index element={<DashboardPage />} />

          {/* Rotas de Clientes */}
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPlaceholder />} />

          {/* Rotas de Alertas */}
          <Route
            path="alerts"
            element={
              <FeaturePlaceholder
                kicker="Monitoramento inteligente"
                title="Alertas e oportunidades"
                description="Situações priorizadas por regras explicáveis para apoiar o assessor."
              />
            }
          />
          <Route path="alerts/:alertId" element={<AlertDetailPlaceholder />} />

          {/* Copiloto IA */}
          <Route
            path="copilot"
            element={
              <FeaturePlaceholder
                kicker="Inteligência aplicada"
                title="Copiloto IA"
                description="Assistente para perguntas em linguagem natural sobre a base de clientes."
              />
            }
          />

          {/* Briefings */}
          <Route
            path="briefings"
            element={
              <FeaturePlaceholder
                kicker="Preparação de reuniões"
                title="Briefings inteligentes"
                description="Pautas de reunião e pontos de atenção consolidados para revisão humana."
              />
            }
          />

          {/* Dados integrados e Configurações */}
          <Route
            path="finance"
            element={
              <FeaturePlaceholder
                kicker="Consolidação patrimonial"
                title="Dados integrados"
                description="Fontes financeiras normalizadas (XP e Open Finance com consentimento)."
              />
            }
          />
          <Route
            path="settings"
            element={
              <FeaturePlaceholder
                kicker="Administração"
                title="Configurações"
                description="Permissões, dados da demonstração e ambiente do assessor."
              />
            }
          />

          {/* Fallback para rota desconhecida */}
          <Route
            path="*"
            element={
              <FeaturePlaceholder
                kicker="Navegação"
                title="Página não encontrada"
                description="O endereço solicitado não existe ou está temporariamente indisponível."
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
