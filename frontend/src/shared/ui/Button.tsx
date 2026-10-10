import React from 'react';

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  children,
  className = '',
  ...props
}) => {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'gold'
      ? 'btn-gold'
      : variant === 'link'
      ? 'btn-link'
      : '';

  const baseClass = variant === 'link' ? 'btn-link' : 'btn';

  return (
    <button className={`${baseClass} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
};
