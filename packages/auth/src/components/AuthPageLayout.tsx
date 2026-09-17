import type { ReactNode } from 'react';
import '../styles/AuthPages.css';

export interface AuthPageLayoutProps {
  children: ReactNode;
  /** Classe ajoutée à `.auth-page` — les modificateurs de page de Socialum
   *  (`.onboarding`). */
  className?: string;
  /** Classe ajoutée à `.auth-page__container` (`.onboarding__container`). */
  containerClassName?: string;
}

export function AuthPageLayout({ children, className, containerClassName }: AuthPageLayoutProps) {
  return (
    <div className={`auth-page${className ? ` ${className}` : ''}`}>
      <div className={`auth-page__container${containerClassName ? ` ${containerClassName}` : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default AuthPageLayout;
