import type { ReactNode } from 'react';
import { useAuth } from '../../context';
import { RouteGuardFallback } from '../RouteGuardFallback';
import { getCurrentPath } from '../intendedPath';
import { useGuardRedirect } from '../useGuardRedirect';
import {
  defaultRouteGuardLabels,
  type RouteGuardBaseProps,
  type RouteGuardLabels,
} from '../types';

export interface RequireAuthProps extends RouteGuardBaseProps {
  /** Page de connexion (défaut : `/auth`). */
  loginPath?: string;
  /**
   * Mémorise le chemin demandé : passé en `state.from` à la navigation ET
   * stocké en session, pour que la page de connexion y renvoie ensuite
   * (`<RedirectIfAuthenticated>` le reprend tout seul).
   * @default false
   */
  preserveFrom?: boolean;
  /**
   * Chemin à mémoriser. Défaut : l'URL courante (`pathname + search + hash`).
   * Les apps react-router peuvent y passer leur `location` formatée.
   */
  fromPath?: string;
  /** Clé de session du chemin mémorisé (défaut : `INTENDED_PATH_STORAGE_KEY`). */
  storageKey?: string;
  /**
   * Laisse passer SANS session : iframe démo de Webum (`?demo=1`), mode
   * invité… La garde ne redirige alors jamais.
   * @default false
   */
  allowUnauthenticated?: boolean;
}

/**
 * Protège une route : redirige vers `loginPath` quand aucune session n'est
 * active.
 *
 * Pendant `loading` la garde rend `fallback` et JAMAIS une redirection — la
 * vérification initiale de session renvoie `user: null` pendant un instant, et
 * rediriger là-dessus éjecte l'utilisateur déjà connecté (le bug qu'ont eu
 * Noesium, Scrapium et Webum).
 *
 * @example react-router (6 ou 7) — une ligne de câblage
 * ```tsx
 * import { Navigate } from 'react-router-dom';
 * <RequireAuth Navigate={Navigate} loginPath="/auth" preserveFrom>
 *   <BillingPage />
 * </RequireAuth>
 * ```
 *
 * @example routeur maison (Monitorum)
 * ```tsx
 * <RequireAuth navigate={navigate} loginPath="/login">{page}</RequireAuth>
 * ```
 */
export function RequireAuth({
  children,
  navigate,
  Navigate,
  loginPath = '/auth',
  fallback,
  preserveFrom = false,
  fromPath,
  storageKey,
  allowUnauthenticated = false,
  labels,
  className,
}: RequireAuthProps) {
  const { user, loading } = useAuth();
  const t: RouteGuardLabels = { ...defaultRouteGuardLabels, ...labels };

  const authorised = allowUnauthenticated || Boolean(user);
  const shouldRedirect = !loading && !authorised;
  const from = preserveFrom ? (fromPath ?? getCurrentPath()) : undefined;

  useGuardRedirect({
    active: shouldRedirect,
    to: loginPath,
    navigate,
    declarative: Boolean(Navigate),
    from,
    storageKey,
  });

  const renderFallback = (label: string): ReactNode =>
    fallback !== undefined ? fallback : <RouteGuardFallback label={label} className={className} />;

  if (loading) return <>{renderFallback(t.loading)}</>;

  if (!authorised) {
    if (Navigate) {
      return <Navigate to={loginPath} replace state={from ? { from } : undefined} />;
    }
    return <>{renderFallback(t.redirecting)}</>;
  }

  return <>{children}</>;
}
