import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'white' | 'outline' | 'ghost-light';

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  white: 'btn-white',
  outline: 'btn-outline',
  'ghost-light': 'btn-ghost-light',
};

interface LinkButtonProps {
  to: string;
  children: ReactNode;
  variant?: Variant;
  size?: 'md' | 'lg';
  className?: string;
}

export function LinkButton({ to, children, variant = 'primary', size = 'md', className = '' }: LinkButtonProps) {
  return (
    <Link to={to} className={`btn btn-${size} ${variantClass[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function ButtonLink({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
}: Omit<LinkButtonProps, 'to'> & { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`btn btn-${size} ${variantClass[variant]} ${className}`}>
      {children}
    </button>
  );
}
