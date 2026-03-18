import { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted';
}

export function Card({ 
  children, 
  className = '', 
  padding = 'md',
  variant = 'default'
}: CardProps) {
  return (
    <div className={`card card--padding-${padding} card--${variant} ${className}`}>
      {children}
    </div>
  );
}

export default Card;
