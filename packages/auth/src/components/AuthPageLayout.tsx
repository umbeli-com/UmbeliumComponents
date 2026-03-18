import type { ReactNode } from 'react';
import '../styles/AuthPages.css';

interface AuthPageLayoutProps {
  children: ReactNode;
}

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-page__container">{children}</div>
    </div>
  );
}

export default AuthPageLayout;
