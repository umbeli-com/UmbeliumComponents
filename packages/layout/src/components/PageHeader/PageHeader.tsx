import { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/layout/styles

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  period?: string;
  actions?: ReactNode;
}

/**
 * Double classe (`page-header` + `umb-page-header`) : la feuille du paquet ne
 * style que la préfixée, l'historique reste émise pour ne rien changer chez
 * les apps déjà en place. Voir PageHeader.scss.
 */
export function PageHeader({ title, subtitle, period, actions }: PageHeaderProps) {
  return (
    <div className="page-header umb-page-header">
      <div className="page-header__content umb-page-header__content">
        <h1 className="page-header__title umb-page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle umb-page-header__subtitle">{subtitle}</p>}
      </div>

      <div className="page-header__meta umb-page-header__meta">
        {period && (
          <div className="page-header__period umb-page-header__period">
            <span className="page-header__period-icon umb-page-header__period-icon">📅</span>
            <span className="page-header__period-text umb-page-header__period-text">{period}</span>
          </div>
        )}
        {actions && <div className="page-header__actions umb-page-header__actions">{actions}</div>}
      </div>
    </div>
  );
}

export default PageHeader;
