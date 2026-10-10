import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, type BadgeVariant } from '../../../shared/ui/Badge';
import { formatMoney } from '../../../shared/formatters/money';
import type { ClientItem } from '../api';
import { normalizeRiskProfile } from '../api';

interface ClientTableProps {
  clients: ClientItem[];
  loading?: boolean;
}

const getRiskBadgeVariant = (risk: string): BadgeVariant => {
  const norm = normalizeRiskProfile(risk);
  switch (norm) {
    case 'Conservador':
      return 'blue';
    case 'Moderado':
      return 'gold';
    case 'Arrojado':
      return 'green';
    default:
      return 'slate';
  }
};

const formatWealth = (value: number | string): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return formatMoney(value);
};

export const ClientTable: React.FC<ClientTableProps> = ({ clients, loading = false }) => {
  if (loading) {
    return (
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Perfil</th>
              <th>Patrimônio</th>
              <th>Instituições</th>
              <th>Alertas</th>
              <th>Próximo contato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="empty">
                <b>Carregando clientes...</b>
                <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  Consultando base de dados do assessor.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Perfil</th>
            <th>Patrimônio</th>
            <th>Instituições</th>
            <th>Alertas</th>
            <th>Próximo contato</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.length > 0 ? (
            clients.map((client) => {
              const riskNormalized = normalizeRiskProfile(client.risk_profile);
              const riskVariant = getRiskBadgeVariant(client.risk_profile);
              const hasAlerts = client.active_alerts_count > 0;

              return (
                <tr key={client.id}>
                  <td>
                    <b>{client.name}</b>
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                      {client.city}
                    </div>
                  </td>
                  <td>
                    <Badge variant={riskVariant}>{riskNormalized}</Badge>
                  </td>
                  <td className="strong">{formatWealth(client.net_worth)}</td>
                  <td>{client.institutions_count}</td>
                  <td>
                    {hasAlerts ? (
                      <Badge variant="gold">{client.active_alerts_count} ativo(s)</Badge>
                    ) : (
                      <Badge variant="green">Nenhum</Badge>
                    )}
                  </td>
                  <td>{client.next_contact_date || 'A definir'}</td>
                  <td>
                    <Link to={`/clients/${client.id}`} className="btn-link">
                      Abrir →
                    </Link>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="empty">
                <b>Nenhum cliente encontrado.</b>
                <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  Tente ajustar os filtros de busca ou o perfil de risco selecionado.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
