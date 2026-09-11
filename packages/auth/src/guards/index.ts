// Gardes de route — agnostiques du routeur (react-router 6 / 7, History API).
export { RequireAuth } from './RequireAuth';
export type { RequireAuthProps } from './RequireAuth';
export { RedirectIfAuthenticated } from './RedirectIfAuthenticated';
export type { RedirectIfAuthenticatedProps } from './RedirectIfAuthenticated';
export { RequireSubscription } from './RequireSubscription';
export type { RequireSubscriptionProps } from './RequireSubscription';
export { RouteGuardFallback } from './RouteGuardFallback';
export type { RouteGuardFallbackProps } from './RouteGuardFallback';

// Contrat de navigation + libellés
export { defaultRouteGuardLabels } from './types';
export type {
  GuardNavigate,
  GuardNavigateComponent,
  GuardNavigateComponentProps,
  GuardNavigateOptions,
  RouteGuardBaseProps,
  RouteGuardLabels,
} from './types';

// Chemin demandé avant connexion
export {
  INTENDED_PATH_STORAGE_KEY,
  clearIntendedPath,
  consumeIntendedPath,
  getCurrentPath,
  readIntendedPath,
  stashIntendedPath,
} from './intendedPath';
export type { IntendedPathOptions } from './intendedPath';
