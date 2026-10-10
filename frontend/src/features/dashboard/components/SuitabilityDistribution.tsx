import React from 'react';
import { Card, SectionHead } from '../../../shared/ui/Card';

interface SuitabilityItem {
  label: string;
  count: number;
  color: string;
}

const mockDistribution: SuitabilityItem[] = [
  { label: 'Conservador', count: 48, color: '#376ac6' },
  { label: 'Moderado', count: 62, color: '#e8b44b' },
  { label: 'Arrojado', count: 18, color: '#1a805a' },
];

export const SuitabilityDistribution: React.FC = () => {
  const total = mockDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card>
      <SectionHead
        title="Distribuição da base por suitability"
        description="Enquadramento de perfil dos clientes sob gestão"
      />

      <div style={{ marginTop: 8 }}>
        {mockDistribution.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={item.label} className="barline">
              <b>{item.label}</b>
              <div className="bar">
                <span style={{ width: `${pct}%`, backgroundColor: item.color }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, width: 35, textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
