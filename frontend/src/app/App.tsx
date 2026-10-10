import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../shared/layout/AppLayout';
import { PageHeader } from '../shared/ui/PageHeader';
import { Card } from '../shared/ui/Card';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ClientsPage } from '../features/clients/ClientsPage';
import { ClientProfilePage } from '../features/clients/ClientProfilePage';
import { CopilotPage } from '../features/copilot/CopilotPage';
import {
  AlertDetailDemoPage,
  AlertsDemoPage,
  BriefingsDemoPage,
  FinanceDemoPage,
  SettingsDemoPage,
} from '../features/demo/DemoPages';
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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Rota principal: Dashboard */}
          <Route index element={<DashboardPage />} />

          {/* Rotas de Clientes */}
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientProfilePage />} />

          {/* Rotas de Alertas */}
          <Route path="alerts" element={<AlertsDemoPage />} />
          <Route path="alerts/:alertId" element={<AlertDetailDemoPage />} />

          {/* Copiloto IA */}
          <Route
            path="copilot"
            element={<CopilotPage />}
          />

          {/* Briefings */}
          <Route path="briefings" element={<BriefingsDemoPage />} />

          {/* Dados integrados e Configurações */}
          <Route path="finance" element={<FinanceDemoPage />} />
          <Route path="settings" element={<SettingsDemoPage />} />

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
