import React from 'react';

export type BadgeVariant = 'gold' | 'red' | 'green' | 'blue' | 'slate';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  className = '',
}) => {
  const variantClass = variant !== 'slate' ? `tag-${variant}` : '';
  return <span className={`tag ${variantClass} ${className}`.trim()}>{children}</span>;
};
