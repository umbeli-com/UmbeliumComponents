import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthChangeEvent,
  AuthError,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { getAuthCallbackUrl, getResetPasswordUrl } from '../utils/authRedirect';
import type { SupabaseAuthClient } from '../utils/supabaseClient';
// Aucun style propre : ce composant ne rend que ses enfants.

/** Portée de la déconnexion. `'global'` invalide la session sur TOUS les appareils. */
export type SignOutScope = 'global' | 'local' | 'others';

export interface SignUpOptions {
  /** Nom complet ; écrit dans `user_metadata` sous `full_name` ET `name` (convention suite). */
  fullName?: string;
  /** Métadonnées additionnelles fusionnées dans `user_metadata`. */
  metadata?: Record<string, unknown>;
  /** Remplace l'URL de confirmation d'e-mail (défaut : `getAuthCallbackUrl()`). */
  emailRedirectTo?: string;
}

export interface ResetPasswordOptions {
  /**
   * URL de retour du lien reçu par email. Défaut : `getResetPasswordUrl()`
   * (`/auth/reset-password`) — une route que plusieurs apps ne déclarent pas,
   * d'où l'appel direct à `resetPasswordForEmail` que Monitorum gardait.
   * Typiquement `getAuthCallbackUrl()`, ou le `resetRedirectTo` d'AuthForm.
   */
  redirectTo?: string;
}

export interface SignInWithGoogleOptions {
  /** URL de retour OAuth. Défaut : `getAuthCallbackUrl()`. */
  redirectTo?: string;
  /**
   * Paramètres ajoutés à l'URL d'autorisation Google — ex.
   * `{ prompt: 'select_account' }` pour forcer le choix du compte (Monitorum).
   */
  queryParams?: Record<string, string>;
  /** Portées OAuth supplémentaires, séparées par des espaces. */
  scopes?: string;
}

/** Chaînes visibles par l'utilisateur, surchargeables. Défauts en français. */
export interface AuthLabels {
  /** Erreur renvoyée quand la configuration Supabase manque. */
  notConfigured: string;
  /** Repli quand une erreur d'authentification ne porte aucun message. */
  unknownError: string;
}

const defaultLabels: AuthLabels = {
  notConfigured: "Authentification indisponible : la configuration Supabase est absente.",
  unknownError: "Une erreur d'authentification est survenue.",
};

export interface AuthContextValue {
  /** Utilisateur courant, `null` si déconnecté. */
  user: User | null;
  /** Session courante (contient `access_token`), `null` si déconnectée. */
  session: Session | null;
  /** `true` tant que la session initiale n'est pas résolue : n'affichez rien de protégé avant. */
  loading: boolean;
  /** Dernière erreur d'authentification, effacée à chaque nouvelle tentative. */
  error: string | null;
  /** `false` quand les variables d'environnement Supabase manquent (voir `createSupabaseAuthClient`). */
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string, options?: SignUpOptions) => Promise<AuthError | null>;
  signOut: () => Promise<AuthError | null>;
  /** OAuth Google ; redirige vers `getAuthCallbackUrl()` (ou `options.redirectTo`).
   *  Résout AVANT la redirection. */
  signInWithGoogle: (options?: SignInWithGoogleOptions) => Promise<AuthError | null>;
  /** Envoie l'e-mail de réinitialisation vers `getResetPasswordUrl()` (ou
   *  `options.redirectTo`). */
  resetPassword: (email: string, options?: ResetPasswordOptions) => Promise<AuthError | null>;
  /** Revalide la session auprès du serveur (après un retour d'onglet, un webhook, un checkout…). */
  refresh: () => Promise<void>;
}

export interface AuthProviderProps {
  /**
   * Client Supabase. Accepte soit le client nu, soit le résultat complet de
   * `createSupabaseAuthClient()` — dans ce cas `isConfigured` est repris tel quel.
   *
   * ⚠️ Créez-le UNE fois, au niveau module, jamais pendant le rendu : un
   * nouveau client à chaque rendu réabonne `onAuthStateChange` en boucle et
   * fait cohabiter plusieurs GoTrueClient sur la même clé de stockage.
   */
  client: SupabaseClient | SupabaseAuthClient;
  children: ReactNode;
  /**
   * Surcharge de `isConfigured` quand on passe un client nu.
   * @default true
   */
  isConfigured?: boolean;
  /** Chaînes visibles par l'utilisateur (défauts FR). */
  labels?: Partial<AuthLabels>;
  /**
   * Valider la session auprès du serveur (`getUser()`) avant le premier rendu,
   * en plus de `getSession()`. Détecte immédiatement une déconnexion globale
   * au prix d'un aller-retour réseau. Passez `false` pour un démarrage
   * purement local (session lue depuis le stockage).
   * @default true
   */
  validateUser?: boolean;
  /**
   * Portée de `signOut()`.
   * @default 'global'
   */
  signOutScope?: SignOutScope;
  /**
   * Échappatoire : reçoit chaque événement Supabase (`TOKEN_REFRESHED`,
   * `PASSWORD_RECOVERY`, …) pour les apps qui doivent en dériver un effet
   * (miroir des jetons, invalidation de cache…).
   *
   * ⚠️ N'appelez JAMAIS `supabase.auth.*` depuis ce callback : supabase-js
   * sérialise ses appels et un appel réentrant peut bloquer (deadlock).
   */
  onAuthEvent?: (event: AuthChangeEvent, session: Session | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Erreur synthétique : le SDK n'est pas joignable, on garde la même forme de retour. */
function configurationError(message: string): AuthError {
  // Une vraie `Error` (pile, `instanceof Error`) plutôt qu'un objet nu :
  // les apps loguent parfois `error.stack` et testent `instanceof Error`.
  const authError = new Error(message) as AuthError;
  authError.name = 'AuthConfigurationError';
  return authError;
}

function resolveClient(
  client: SupabaseClient | SupabaseAuthClient,
  isConfiguredProp?: boolean,
): { supabase: SupabaseClient; isConfigured: boolean } {
  if ('client' in client && 'isConfigured' in client) {
    return {
      supabase: client.client,
      isConfigured: isConfiguredProp ?? client.isConfigured,
    };
  }
  return { supabase: client as SupabaseClient, isConfigured: isConfiguredProp ?? true };
}

/** `true` seulement si le navigateur affirme être hors ligne. */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Provider d'authentification Supabase de la suite.
 *
 * - `getSession()` (précédé de `getUser()` si `validateUser`) résout `loading`
 *   AVANT le premier rendu protégé ;
 * - l'abonnement `onAuthStateChange` est ouvert dans le même effet et fermé au
 *   démontage ; ses événements sont ignorés tant que l'initialisation n'est pas
 *   terminée, sinon le `INITIAL_SESSION` émis à l'abonnement écrase la
 *   validation serveur en cours (course observée sur Noesium/Scrapium).
 */
export function AuthProvider({
  client,
  children,
  isConfigured: isConfiguredProp,
  labels,
  validateUser = true,
  signOutScope = 'global',
  onAuthEvent,
}: AuthProviderProps) {
  const { supabase, isConfigured } = useMemo(
    () => resolveClient(client, isConfiguredProp),
    [client, isConfiguredProp],
  );
  // Dépendances sur les VALEURS, pas sur l'identité de l'objet : une app qui
  // passe `labels={{ ... }}` en littéral inline recréerait sinon `t` — donc
  // `fail`, `guard` et la valeur de contexte — à CHAQUE rendu du parent, ce qui
  // re-rendrait tous les consommateurs.
  const { notConfigured: notConfiguredLabel, unknownError: unknownErrorLabel } = labels ?? {};
  const t = useMemo<AuthLabels>(
    () => ({
      notConfigured: notConfiguredLabel ?? defaultLabels.notConfigured,
      unknownError: unknownErrorLabel ?? defaultLabels.unknownError,
    }),
    [notConfiguredLabel, unknownErrorLabel],
  );

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** `false` après démontage : empêche `refresh()` d'écrire dans un composant démonté. */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Garde la référence fraîche sans réabonner l'effet à chaque rendu du parent. */
  const onAuthEventRef = useRef(onAuthEvent);
  useEffect(() => {
    onAuthEventRef.current = onAuthEvent;
  }, [onAuthEvent]);

  /** Lit l'état d'auth réel. `getUser()` interroge le serveur, `getSession()` le stockage. */
  const readAuthState = useCallback(async (): Promise<{ session: Session | null; user: User | null }> => {
    if (!isConfigured) return { session: null, user: null };

    try {
      if (validateUser) {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          // Hors ligne, `getUser()` échoue toujours : on fait confiance à la
          // session en cache plutôt que de déconnecter l'utilisateur à tort.
          if (isOffline()) {
            const { data: cached } = await supabase.auth.getSession();
            if (cached.session) return { session: cached.session, user: cached.session.user };
          }
          return { session: null, user: null };
        }

        const { data: current } = await supabase.auth.getSession();
        return { session: current.session ?? null, user: data.user };
      }

      const { data } = await supabase.auth.getSession();
      return { session: data.session ?? null, user: data.session?.user ?? null };
    } catch {
      if (isOffline()) {
        try {
          const { data: cached } = await supabase.auth.getSession();
          if (cached.session) return { session: cached.session, user: cached.session.user };
        } catch {
          /* on retombe sur l'état déconnecté */
        }
      }
      return { session: null, user: null };
    }
  }, [supabase, isConfigured, validateUser]);

  useEffect(() => {
    let mounted = true;
    const initDone = { current: false };
    /**
     * Dernier événement RÉEL reçu pendant l'initialisation. On ne peut pas
     * l'appliquer tout de suite (il écraserait la validation serveur en cours),
     * mais le jeter serait pire : une page `/auth/callback` qui appelle
     * `exchangeCodeForSession()` en parallèle émet `SIGNED_IN` pendant le
     * `getUser()` d'init, et l'utilisateur resterait déconnecté.
     */
    const pending: { has: boolean; session: Session | null } = { has: false, session: null };

    if (!isConfigured) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      const next = await readAuthState();
      if (!mounted) return;
      if (pending.has) {
        // Un événement postérieur au démarrage fait foi sur l'état lu à l'init.
        setSession(pending.session);
        setUser(pending.session?.user ?? null);
      } else {
        setSession(next.session);
        setUser(next.user);
      }
      initDone.current = true;
      setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      onAuthEventRef.current?.(event, nextSession);
      if (!initDone.current) {
        // `INITIAL_SESSION` n'est qu'un miroir du stockage : il écraserait la
        // validation serveur en cours (course observée sur Noesium/Scrapium).
        // Tout autre événement est une nouvelle réelle : on le met de côté.
        if (event !== 'INITIAL_SESSION') {
          pending.has = true;
          pending.session = nextSession;
        }
        return;
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, isConfigured, readAuthState]);

  const refresh = useCallback(async () => {
    const next = await readAuthState();
    if (!mountedRef.current) return;
    setSession(next.session);
    setUser(next.user);
    setLoading(false);
  }, [readAuthState]);

  /** Enregistre l'erreur pour l'UI et la renvoie à l'appelant. */
  const fail = useCallback(
    (authError: AuthError | null): AuthError | null => {
      if (!authError) return null;
      setError(authError.message || t.unknownError);
      return authError;
    },
    [t.unknownError],
  );

  const guard = useCallback((): AuthError | null => {
    if (isConfigured) return null;
    const configError = configurationError(t.notConfigured);
    setError(configError.message);
    return configError;
  }, [isConfigured, t.notConfigured]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const blocked = guard();
      if (blocked) return blocked;

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      return fail(signInError);
    },
    [supabase, guard, fail],
  );

  const signUp = useCallback(
    async (email: string, password: string, options: SignUpOptions = {}) => {
      setError(null);
      const blocked = guard();
      if (blocked) return blocked;

      const { fullName, metadata, emailRedirectTo } = options;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            // `full_name` ET `name` : les deux clés sont lues selon les apps.
            ...(fullName ? { full_name: fullName, name: fullName } : {}),
          },
          emailRedirectTo: emailRedirectTo ?? getAuthCallbackUrl(),
        },
      });
      return fail(signUpError);
    },
    [supabase, guard, fail],
  );

  const signOut = useCallback(async () => {
    setError(null);
    // Pas de `guard()` ici : sans configuration il n'y a rien à révoquer, mais
    // l'état local doit quand même être vidé pour ne pas bloquer l'UI.
    if (isConfigured) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: signOutScope });
      if (signOutError) return fail(signOutError);
      // `'others'` révoque les AUTRES appareils : supabase-js conserve
      // volontairement la session locale. Vider l'état ici afficherait un
      // utilisateur « déconnecté » alors qu'il est toujours authentifié.
      if (signOutScope === 'others') return null;
    }
    setSession(null);
    setUser(null);
    return null;
  }, [supabase, isConfigured, signOutScope, fail]);

  const signInWithGoogle = useCallback(
    async (options: SignInWithGoogleOptions = {}) => {
      setError(null);
      const blocked = guard();
      if (blocked) return blocked;

      // Sans options, l'objet envoyé est exactement celui d'avant
      // (`{ redirectTo }`) : `queryParams` / `scopes` ne sont posés que fournis.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: options.redirectTo ?? getAuthCallbackUrl(),
          ...(options.queryParams ? { queryParams: options.queryParams } : {}),
          ...(options.scopes ? { scopes: options.scopes } : {}),
        },
      });
      return fail(oauthError);
    },
    [supabase, guard, fail],
  );

  const resetPassword = useCallback(
    async (email: string, options: ResetPasswordOptions = {}) => {
      setError(null);
      const blocked = guard();
      if (blocked) return blocked;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: options.redirectTo ?? getResetPasswordUrl(),
      });
      return fail(resetError);
    },
    [supabase, guard, fail],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      error,
      isConfigured,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resetPassword,
      refresh,
    }),
    [
      user,
      session,
      loading,
      error,
      isConfigured,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resetPassword,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Accès au contexte d'authentification.
 * @throws si appelé hors d'un `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>");
  }
  return context;
}
