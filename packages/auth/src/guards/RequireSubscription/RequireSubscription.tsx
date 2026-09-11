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

export interface RequireSubscriptionProps extends RouteGuardBaseProps {
  /** `true` quand l'abonnement — ou l'essai — donne accès à l'app. */
  hasAccess: boolean;
  /** `true` tant que le statut d'abonnement n'est pas connu (défaut : false). */
  loading?: boolean;
  /**
   * Écran affiché quand l'accès est refusé — typiquement le
   * `<SubscriptionGate>` de `@umbeli-com/billing`, passé en ReactNode pour que
   * `@umbeli-com/auth` ne dépende pas du package de facturation.
   */
  gate: ReactNode;
  /**
   * Coupe complètement le gating (app sans facturation, env sans API de
   * billing : le `env.billingApiBaseUrl` d'Anonymum).
   * @default true
   */
  enabled?: boolean;
  /**
   * Laisse passer quand le navigateur se déclare hors ligne : le statut
   * d'abonnement n'est alors pas vérifiable, et bloquer une app installée en
   * PWA sur une panne réseau serait pire que le risque.
   * @default true
   */
  allowWhenOffline?: boolean;
  /**
   * Exige aussi une session : sans utilisateur, redirige vers `loginPath`.
   * @default true
   */
  requireAuth?: boolean;
  /** Page de connexion (défaut : `/auth`). */
  loginPath?: string;
  /** Mémorise le chemin demandé avant la redirection de connexion. */
  preserveFrom?: boolean;
  /** Chemin à mémoriser (défaut : l'URL courante). */
  fromPath?: string;
  /** Clé de session du chemin mémorisé. */
  storageKey?: string;
  /** Laisse passer sans session (iframe démo, invité). @default false */
  allowUnauthenticated?: boolean;
}

/** `true` seulement si le navigateur affirme être hors ligne. */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Protège le shell payant : session requise, puis abonnement actif.
 *
 * L'ordre est celui qu'appliquaient déjà Anonymum, Scrapium et Monitorum :
 * 1. session en cours de vérification → `fallback` (jamais de redirection) ;
 * 2. pas de session → redirection vers `loginPath` ;
 * 3. statut d'abonnement inconnu → `fallback` ;
 * 4. pas d'accès → `gate` (l'écran de vente, PAS une redirection) ;
 * 5. sinon → `children`.
 *
 * @example
 * ```tsx
 * <RequireSubscription
 *   Navigate={Navigate}
 *   hasAccess={hasActiveSubscription}
 *   loading={subscription.loading}
 *   gate={<SubscriptionGate {...gateProps} />}
 * >
 *   <WorkspacePage />
 * </RequireSubscription>
 * ```
 */
export function RequireSubscription({
  children,
  navigate,
  Navigate,
  hasAccess,
  loading: subscriptionLoading = false,
  gate,
  enabled = true,
  allowWhenOffline = true,
  requireAuth = true,
  loginPath = '/auth',
  fallback,
  preserveFrom = false,
  fromPath,
  storageKey,
  allowUnauthenticated = false,
  labels,
  className,
}: RequireSubscriptionProps) {
  const { user, loading: authLoading } = useAuth();
  const t: RouteGuardLabels = { ...defaultRouteGuardLabels, ...labels };

  const authorised = !requireAuth || allowUnauthenticated || Boolean(user);
  const shouldRedirect = !authLoading && !authorised;
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

  if (authLoading) return <>{renderFallback(t.loading)}</>;

  if (!authorised) {
    if (Navigate) {
      return <Navigate to={loginPath} replace state={from ? { from } : undefined} />;
    }
    return <>{renderFallback(t.redirecting)}</>;
  }

  if (!enabled) return <>{children}</>;

  if (subscriptionLoading) return <>{renderFallback(t.loading)}</>;

  if (!hasAccess && !(allowWhenOffline && isOffline())) return <>{gate}</>;

  return <>{children}</>;
}
