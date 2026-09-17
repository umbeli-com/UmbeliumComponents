import type { ReactNode } from 'react';

export interface AuthHeaderProps {
  /** Copie canonique Umbelium — passer '' pour masquer explicitement. */
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  logoText?: string;
  /** Logo image du SaaS (le même que le favicon), affiché devant le nom. */
  logoSrc?: string;
  /**
   * Contrôles DANS l'en-tête, après le sous-titre — les boutons thème / langue
   * de l'onboarding de Socialum. Rendus dans `div.auth-page__header-actions`,
   * seulement s'ils sont fournis.
   */
  actions?: ReactNode;
  /** Classe ajoutée à `.auth-page__header`. */
  className?: string;
}

export function AuthHeader({
  title = 'Connexion',
  subtitle = 'Connectez-vous à votre compte pour continuer',
  showLogo = true,
  logoText = 'Umbeli',
  logoSrc,
  actions,
  className,
}: AuthHeaderProps) {
  return (
    <div className={`auth-page__header${className ? ` ${className}` : ''}`}>
      {showLogo ? (
        <div className="auth-page__logo">
          {logoSrc ? (
            <img className="auth-page__logo-img" src={logoSrc} alt="" aria-hidden="true" />
          ) : null}
          <span className="auth-page__logo-text">{logoText}</span>
        </div>
      ) : null}
      {title ? <h1 className="auth-page__title">{title}</h1> : null}
      {subtitle ? <p className="auth-page__subtitle">{subtitle}</p> : null}
      {actions !== undefined && actions !== null && actions !== false ? (
        <div className="auth-page__header-actions">{actions}</div>
      ) : null}
    </div>
  );
}

export default AuthHeader;
