import type { ComponentType, ReactNode } from 'react';

/**
 * Contrat de navigation des gardes — VOLONTAIREMENT agnostique du routeur.
 *
 * La suite fait tourner react-router 6, react-router 7 et, sur Monitorum, un
 * routage maison sur l'History API : le package ne peut donc dépendre d'aucun
 * routeur. Comme `SidebarNav` (@umbeli-com/layout) qui reçoit `renderLink` /
 * `isActive`, les gardes reçoivent la navigation en props.
 */
export interface GuardNavigateOptions {
  /** Remplace l'entrée courante au lieu d'en empiler une nouvelle. */
  replace?: boolean;
  /** État transporté avec la navigation (convention react-router : `{ from }`). */
  state?: unknown;
}

/** Navigation impérative — `useNavigate()` de react-router s'y branche tel quel. */
export type GuardNavigate = (to: string, options?: GuardNavigateOptions) => void;

/** Props structurelles du composant de redirection déclaratif (`<Navigate>`). */
export interface GuardNavigateComponentProps {
  to: string;
  replace?: boolean;
  state?: unknown;
}

/**
 * Composant de redirection déclaratif. Signature STRUCTURELLE plutôt qu'un
 * import de react-router : le `Navigate` de react-router 6 comme celui de 7
 * lui sont assignables, sans que le package ne dépende d'aucun des deux.
 */
export type GuardNavigateComponent = ComponentType<GuardNavigateComponentProps>;

/** Chaînes visibles par l'utilisateur, surchargeables. Défauts en français. */
export interface RouteGuardLabels {
  /** Affiché pendant la vérification de session (fallback par défaut). */
  loading: string;
  /** Affiché le temps que la redirection impérative aboutisse. */
  redirecting: string;
}

export const defaultRouteGuardLabels: RouteGuardLabels = {
  loading: 'Chargement…',
  redirecting: 'Redirection…',
};

/** Props communes aux trois gardes. */
export interface RouteGuardBaseProps {
  /** Contenu protégé, rendu seulement quand la garde laisse passer. */
  children: ReactNode;
  /** Navigation impérative (routeur maison, ou `useNavigate()`). */
  navigate?: GuardNavigate;
  /** Redirection déclarative — passer le `Navigate` de react-router. */
  Navigate?: GuardNavigateComponent;
  /**
   * Rendu pendant la vérification de session ET pendant la redirection.
   * Passer `null` pour ne rien afficher ; omettre pour le placeholder maison.
   */
  fallback?: ReactNode;
  /** Chaînes du placeholder par défaut (défauts FR). */
  labels?: Partial<RouteGuardLabels>;
  /** Classe appliquée au placeholder par défaut. */
  className?: string;
}
