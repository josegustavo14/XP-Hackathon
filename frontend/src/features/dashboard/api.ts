import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';
import type { DashboardSummary } from '../../shared/api/generated';

const mockDashboard: DashboardSummary = {
  clientCount: 128,
  managedAssets: '184500000.00',
  activeAlerts: 12,
  priorityClients: [
    { id: '1', name: 'Mariana Costa', riskProfile: 'moderado', netWorth: '1250000.00' },
    { id: '2', name: 'Rafael Almeida', riskProfile: 'arrojado', netWorth: '830000.50' },
  ],
};

export const dashboardApi = {
  summary: () => (env.useMocks ? Promise.resolve(mockDashboard) : request<DashboardSummary>('/dashboard/summary')),
};
