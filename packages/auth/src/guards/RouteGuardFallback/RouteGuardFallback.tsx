/**
 * Placeholder rendu par les gardes pendant la vérification de session.
 *
 * Aucun import de `.scss` ici : la feuille rejoint `dist` via
 * `src/styles/index.scss` (convention de la maison). Sans cette feuille le
 * composant reste lisible — juste non centré.
 */
export interface RouteGuardFallbackProps {
  /** Texte d'état (déjà traduit par la garde). */
  label?: string;
  className?: string;
}

export function RouteGuardFallback({ label, className }: RouteGuardFallbackProps) {
  const classes = ['auth-route-guard', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <span className="auth-route-guard__spinner" aria-hidden="true" />
      {label ? <span className="auth-route-guard__label">{label}</span> : null}
    </div>
  );
}
