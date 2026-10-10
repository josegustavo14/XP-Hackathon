import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { formatMoney } from '../../../shared/formatters/money';
import type { ClientPortfolioData } from '../types';

interface PortfolioTabProps {
  portfolio: ClientPortfolioData;
  onNavigateFinance?: () => void;
}

const formatWealth = (value: number | string): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return formatMoney(value);
};

const getAssetClassBadge = (assetClass: string) => {
  switch (assetClass.toLowerCase()) {
    case 'fixed_income':
      return <Badge variant="green">Renda Fixa</Badge>;
    case 'fund':
      return <Badge variant="gold">Fundos Imobiliários</Badge>;
    case 'equity':
      return <Badge variant="red">Renda Variável</Badge>;
    case 'cash':
      return <Badge variant="blue">Caixa / Liquidez</Badge>;
    default:
      return <Badge variant="slate">{assetClass}</Badge>;
  }
};

export const PortfolioTab: React.FC<PortfolioTabProps> = ({
  portfolio,
  onNavigateFinance,
}) => {
  return (
    <div className="portfolio-tab-content">
      {/* Resumo da Carteira e Gráfico de Classes */}
      <div className="split">
        {/* Alocação por Classe */}
        <Card>
          <div className="sectionhead">
            <div>
              <h2>Alocação por Classe de Ativos</h2>
              <p>Distribuição consolidada entre carteira XP e Open Finance</p>
            </div>
            <span className="text-xs text-muted">
              Posição em {new Date(portfolio.as_of).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Barra segmentada de alocação total */}
          <div className="allocation-segmented-bar">
            {portfolio.allocation_by_class.map((item) => (
              <div
                key={item.asset_class}
                className="allocation-bar-segment"
                style={{
                  width: `${Math.max(item.percentage, 3)}%`,
                  backgroundColor: item.color,
                }}
                title={`${item.label}: ${item.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Lista com detalhamento por classe */}
          <div className="allocation-legend-list">
            {portfolio.allocation_by_class.map((item) => (
              <div key={item.asset_class} className="allocation-legend-item">
                <div className="row align-center">
                  <span
                    className="legend-color-dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="legend-label">{item.label}</div>
                    <div className="legend-hint">{item.percentage.toFixed(1)}% da carteira</div>
                  </div>
                </div>
                <div className="legend-value">{formatWealth(item.value)}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Resumo Consolidado e Saldo em Caixa */}
        <Card>
          <div className="sectionhead">
            <div>
              <h2>Patrimônio Consolidado</h2>
              <p>Total sob gestão e saldo disponível</p>
            </div>
          </div>

          <div className="portfolio-summary-box">
            <span className="summary-label">Total Consolidado</span>
            <div className="summary-total-val">{formatWealth(portfolio.total_value)}</div>
            <span className="summary-sub">
              {portfolio.institutions.length} instituição(ões) integradas via Open Finance
            </span>

            <div className="summary-divider" />

            <div className="cash-balance-box">
              <span className="summary-label">Saldo em Caixa / Liquidez Imediata</span>
              <div className="cash-val">{formatWealth(portfolio.cash_value)}</div>
              <span className="cash-percentage">
                {portfolio.cash_percentage.toFixed(1)}% do patrimônio total
              </span>
            </div>

            <div className="open-finance-cta">
              <p>Dados unificados com consentimento Open Finance do cliente.</p>
              {onNavigateFinance && (
                <Button variant="secondary" className="btn-sm" onClick={onNavigateFinance}>
                  Gerenciar conexões Open Finance →
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Distribuição por Instituição Financeira */}
      <Card className="section">
        <div className="sectionhead">
          <div>
            <h2>Distribuição por Instituição Financeira</h2>
            <p>Divisão de custódia entre corretora XP e outros bancos conectados</p>
          </div>
        </div>

        <div className="institutions-grid">
          {portfolio.institutions.map((inst) => (
            <div key={inst.name} className="institution-card">
              <div className="row justify-between align-center">
                <span className="institution-name">{inst.name}</span>
                <span className="institution-share">{inst.percentage.toFixed(1)}%</span>
              </div>
              <div className="institution-val">{formatWealth(inst.value)}</div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${inst.percentage}%`,
                    backgroundColor: inst.name.includes('XP') ? '#e8b44b' : '#376ac6',
                  }}
                />
              </div>
              <span className="institution-source">{inst.source}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabela de Posições Custodiadas */}
      <Card className="section">
        <div className="sectionhead">
          <div>
            <h2>Posições Detalhadas em Custódia</h2>
            <p>Ativos em carteira com cotação e valor de mercado atualizado</p>
          </div>
          <Badge variant="slate">{portfolio.positions.length} ativos</Badge>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Código / Ativo</th>
                <th>Classe</th>
                <th>Emissor</th>
                <th>Qtd.</th>
                <th>Preço Unit.</th>
                <th>Valor de Mercado</th>
                <th>Vencimento</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((pos) => (
                <tr key={pos.asset_code}>
                  <td>
                    <div className="asset-title-block">
                      <span className="asset-code">{pos.asset_code}</span>
                      <span className="asset-name">{pos.asset_name}</span>
                    </div>
                  </td>
                  <td>{getAssetClassBadge(pos.asset_class)}</td>
                  <td className="muted">{pos.issuer}</td>
                  <td>{Number(pos.quantity).toLocaleString('pt-BR')}</td>
                  <td>{formatWealth(pos.unit_price)}</td>
                  <td className="strong">{formatWealth(pos.market_value)}</td>
                  <td className="muted">
                    {pos.maturity_date ? new Date(pos.maturity_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td>
                    <span className="institution-tag">{pos.source}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
