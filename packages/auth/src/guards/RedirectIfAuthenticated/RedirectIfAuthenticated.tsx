import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../context';
import { RouteGuardFallback } from '../RouteGuardFallback';
import { consumeIntendedPath } from '../intendedPath';
import { useGuardRedirect } from '../useGuardRedirect';
import {
  defaultRouteGuardLabels,
  type RouteGuardBaseProps,
  type RouteGuardLabels,
} from '../types';

export interface RedirectIfAuthenticatedProps extends RouteGuardBaseProps {
  /** Destination quand une session est active (défaut : `/app`). */
  to?: string;
  /**
   * Reprend le chemin mémorisé par `<RequireAuth preserveFrom>` au lieu de
   * `to` : l'utilisateur revient là où il allait avant la connexion.
   * @default true
   */
  preferIntendedPath?: boolean;
  /** Clé de session du chemin mémorisé (défaut : `INTENDED_PATH_STORAGE_KEY`). */
  storageKey?: string;
  /** Âge maximal du chemin mémorisé, en millisecondes (défaut : 30 min). */
  intendedPathMaxAgeMs?: number;
  /**
   * Force l'état « connecté » sans session Supabase (mode invité).
   * @default false
   */
  treatAsAuthenticated?: boolean;
}

/**
 * Inverse de `<RequireAuth>` : garde les pages publiques (landing, connexion,
 * inscription) et renvoie vers l'app dès qu'une session est active.
 *
 * Pendant `loading`, rend `fallback` — jamais de redirection.
 *
 * @example
 * ```tsx
 * import { Navigate } from 'react-router-dom';
 * <RedirectIfAuthenticated Navigate={Navigate} to="/app"><AuthPage /></RedirectIfAuthenticated>
 * ```
 */
export function RedirectIfAuthenticated({
  children,
  navigate,
  Navigate,
  to = '/app',
  fallback,
  preferIntendedPath = true,
  storageKey,
  intendedPathMaxAgeMs,
  treatAsAuthenticated = false,
  labels,
  className,
}: RedirectIfAuthenticatedProps) {
  const { user, loading } = useAuth();
  const t: RouteGuardLabels = { ...defaultRouteGuardLabels, ...labels };

  const authenticated = treatAsAuthenticated || Boolean(user);
  const shouldRedirect = !loading && authenticated;

  /**
   * La destination est FIGÉE au moment où la redirection est décidée : le
   * chemin mémorisé est consommé une seule fois, donc un second rendu ne doit
   * pas retomber sur `to` et déclencher une deuxième navigation.
   */
  const [target, setTarget] = useState<string | null>(null);
  /**
   * Miroir de `target` lisible dans l'effet SANS le mettre en dépendance : le
   * chemin mémorisé n'est consommé (donc effacé) qu'une seule fois, y compris
   * quand StrictMode rejoue les effets au montage.
   */
  const targetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldRedirect) {
      if (targetRef.current !== null) {
        targetRef.current = null;
        setTarget(null);
      }
      return;
    }
    if (targetRef.current !== null) return;
    // La consommation reste HORS de l'updater de `setTarget` : StrictMode
    // rejoue les updaters, et un effet de bord dedans effacerait le chemin
    // mémorisé avant de le lire une seconde fois.
    const intended = preferIntendedPath
      ? consumeIntendedPath({ key: storageKey, maxAgeMs: intendedPathMaxAgeMs })
      : null;
    const resolved = intended ?? to;
    targetRef.current = resolved;
    setTarget(resolved);
  }, [shouldRedirect, preferIntendedPath, storageKey, intendedPathMaxAgeMs, to]);

  useGuardRedirect({
    active: shouldRedirect && target !== null,
    to: target ?? to,
    navigate,
    declarative: Boolean(Navigate),
  });

  const renderFallback = (label: string): ReactNode =>
    fallback !== undefined ? fallback : <RouteGuardFallback label={label} className={className} />;

  if (loading) return <>{renderFallback(t.loading)}</>;

  if (authenticated) {
    if (Navigate && target) return <Navigate to={target} replace />;
    return <>{renderFallback(t.redirecting)}</>;
  }

  return <>{children}</>;
}
