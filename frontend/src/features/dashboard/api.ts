import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';
import type { DashboardSummary } from '../../shared/api/generated';

const mockDashboard: DashboardSummary = {
  client_count: 2,
  managed_assets: '2115000.50',
  open_alerts: 3,
  priority_clients: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Mariana Costa', risk_profile: 'moderate', total_assets: '1280000.00', open_alerts: 2, attention_level: 'high' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Rafael Almeida', risk_profile: 'aggressive', total_assets: '835000.50', open_alerts: 1, attention_level: 'medium' },
  ],
};

export const dashboardApi = {
  summary: () => (env.useMocks ? Promise.resolve(mockDashboard) : request<DashboardSummary>('/dashboard/summary')),
};
