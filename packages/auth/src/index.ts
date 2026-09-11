// Auth components
export * from './components';

// Contexte Supabase — le contrat d'auth de la suite en un seul endroit
export { AuthProvider, useAuth } from './context';
export type { AuthContextValue, AuthLabels, AuthProviderProps, SignOutScope, SignUpOptions } from './context';

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
