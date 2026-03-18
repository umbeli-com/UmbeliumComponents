import { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/layout/styles

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  period?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, period, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__content">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      <div className="page-header__meta">
        {period && (
          <div className="page-header__period">
            <span className="page-header__period-icon">📅</span>
            <span className="page-header__period-text">{period}</span>
          </div>
        )}
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </div>
  );
}

export default PageHeader;
