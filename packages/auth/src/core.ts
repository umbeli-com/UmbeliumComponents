/**
 * `@umbeli-com/auth/core` — contexte, gardes de routes et utilitaires, SANS
 * aucun composant visuel ni feuille de style.
 *
 * Pourquoi un point d'entrée séparé : la racine `@umbeli-com/auth` réexporte
 * `AuthPageLayout`, qui importe `AuthPages.css` en effet de bord. Un import CSS
 * n'est jamais élagué : TOUTE app qui importe la racine — ne serait-ce que
 * `useAuth` — embarque cette feuille, qui style `.auth-page` (fond clair,
 * Manrope). Mesuré chez Servum, dont la page de connexion porte déjà
 * `.auth-page` en fond sombre : elle virait au blanc. La racine garde ce
 * comportement (les apps actuelles s'en servent pour charger la feuille) ;
 * `/core` et `/form` en sont exempts.
 */
// Contexte Supabase — le contrat d'auth de la suite en un seul endroit
export { AuthProvider, useAuth } from './context';
export type {
  AuthContextValue,
  AuthLabels,
  AuthProviderProps,
  ResetPasswordOptions,
  SignInWithGoogleOptions,
  SignOutScope,
  SignUpOptions,
} from './context';

export { createSupabaseAuthClient } from './utils/supabaseClient';
export type { CreateSupabaseAuthClientOptions, SupabaseAuthClient } from './utils/supabaseClient';

// Garde-fous de routes (agnostiques du router, comme SidebarNav)
export { RequireAuth, RedirectIfAuthenticated, RequireSubscription, RouteGuardFallback } from './guards';
export type {
  RequireAuthProps,
  RedirectIfAuthenticatedProps,
  RequireSubscriptionProps,
  RouteGuardFallbackProps,
  GuardNavigate,
  GuardNavigateComponent,
  GuardNavigateComponentProps,
  GuardNavigateOptions,
  RouteGuardBaseProps,
  RouteGuardLabels,
  IntendedPathOptions,
} from './guards';
export { defaultRouteGuardLabels } from './guards';
export {
  INTENDED_PATH_STORAGE_KEY,
  clearIntendedPath,
  consumeIntendedPath,
  getCurrentPath,
  readIntendedPath,
  stashIntendedPath,
} from './guards';

// Auth utilities
export { getAuthCallbackUrl, getResetPasswordUrl } from './utils/authRedirect';
export { createAuthedFetch, joinApiUrl, AuthedFetchError, DEFAULT_AUTHED_FETCH_LABELS } from './utils/authedFetch';
export type {
  AuthedFetch,
  CreateAuthedFetchOptions,
  AuthedFetchLabels,
  AuthedFetchErrorDetails,
  AuthedFetchSupabaseClient,
  AuthedFetchAuthApi,
  AuthedFetchSession,
  AuthedFetchSessionResult,
} from './utils/authedFetch';
