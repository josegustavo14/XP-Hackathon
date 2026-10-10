import React from 'react';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  foot?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  foot,
  className = '',
}) => {
  return (
    <div className={`card ${className}`.trim()}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {foot && <div className="metric-foot">{foot}</div>}
    </div>
  );
};
