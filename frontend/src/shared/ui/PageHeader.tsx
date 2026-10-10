import React from 'react';

interface PageHeaderProps {
  kicker: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  lead,
  action,
}) => {
  return (
    <div>
      <div className="kicker">{kicker}</div>
      <div className="headline">
        <h1>{title}</h1>
        {action && <div>{action}</div>}
      </div>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
};
