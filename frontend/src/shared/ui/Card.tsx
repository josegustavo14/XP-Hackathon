import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return <div className={`card ${className}`.trim()}>{children}</div>;
};

interface SectionHeadProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHead: React.FC<SectionHeadProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="sectionhead">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
