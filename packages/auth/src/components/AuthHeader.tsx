interface AuthHeaderProps {
  /** Copie canonique Umbelium — passer '' pour masquer explicitement. */
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  logoText?: string;
  /** Logo image du SaaS (le même que le favicon), affiché devant le nom. */
  logoSrc?: string;
}

export function AuthHeader({
  title = 'Connexion',
  subtitle = 'Connectez-vous à votre compte pour continuer',
  showLogo = true,
  logoText = 'Umbeli',
  logoSrc,
}: AuthHeaderProps) {
  return (
    <div className="auth-page__header">
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
    </div>
  );
}

export default AuthHeader;
