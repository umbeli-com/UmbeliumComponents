interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  logoText?: string;
}

export function AuthHeader({
  title,
  subtitle,
  showLogo = true,
  logoText = 'Umbeli',
}: AuthHeaderProps) {
  return (
    <div className="auth-page__header">
      {showLogo ? (
        <div className="auth-page__logo">
          <span className="auth-page__logo-text">{logoText}</span>
        </div>
      ) : null}
      {title ? <h1 className="auth-page__title">{title}</h1> : null}
      {subtitle ? <p className="auth-page__subtitle">{subtitle}</p> : null}
    </div>
  );
}

export default AuthHeader;
