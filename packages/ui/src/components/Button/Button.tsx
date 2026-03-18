import { ButtonHTMLAttributes, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`button button--${variant} button--${size} ${fullWidth ? 'button--full-width' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
