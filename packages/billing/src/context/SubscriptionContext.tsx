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
import {
  createBillingClient,
  type BillingClient,
  type SubscriptionStatus,
} from '../utils/BillingClient';
import { trialDaysLeft as computeTrialDaysLeft } from '../utils/trial';
// Aucun style propre : ce provider ne rend que ses enfants.

/** Statut de repli quand l'API est injoignable : accès refusé, la porte s'affiche. */
const FALLBACK_STATUS: SubscriptionStatus = { plan: 'free', status: 'none', periodEnd: null };

/** Délai minimal entre deux rafraîchissements déclenchés par le retour d'onglet. */
const DEFAULT_FOCUS_DEBOUNCE_MS = 30_000;

/** Nom du paramètre d'URL portant l'intention d'essai (convention suite). */
const DEFAULT_TRIAL_INTENT_PARAM = 'start_trial';

/** Chaînes visibles par l'utilisateur, surchargeables. Défauts en français. */
export interface SubscriptionLabels {
  /** Repli quand la vérification de l'abonnement échoue sans message. */
  fetchError: string;
  /** Repli quand le démarrage de l'essai échoue sans message. */
  trialError: string;
  /** Repli quand l'ouverture du paiement échoue sans message. */
  checkoutError: string;
  /** Repli quand l'ouverture du portail de facturation échoue sans message. */
  portalError: string;
}

const defaultLabels: SubscriptionLabels = {
  fetchError: "Impossible de vérifier votre abonnement.",
  trialError: "Impossible de démarrer l'essai gratuit.",
  checkoutError: "Impossible d'ouvrir le paiement.",
  portalError: "Impossible d'ouvrir le portail de facturation.",
};

/** Options communes aux redirections Stripe (checkout et portail). */
export interface CheckoutOptions {
  /** URL de retour Stripe. Défaut : la page in-app courante (voir BillingClient). */
  returnUrl?: string;
  /**
   * Rediriger l'onglet courant vers l'URL Stripe.
   * Passez `false` pour gérer la navigation vous-même (`window.open`, router…).
   * @default true
   */
  redirect?: boolean;
}

export interface SubscriptionContextValue {
  /** Dernier statut connu, `null` tant que rien n'a été chargé. */
  subscription: SubscriptionStatus | null;
  /** `true` pendant le premier chargement (jamais bloqué : une erreur le libère). */
  loading: boolean;
  /** Dernière erreur de facturation, effacée à chaque nouvelle tentative. */
  error: string | null;
  /** `true` quand l'utilisateur a le droit d'utiliser l'app (`active`/`trialing`, non bloqué). */
  hasActiveSubscription: () => boolean;
  /** `true` quand l'abonnement est en période d'essai. */
  isTrialing: boolean;
  /**
   * Jours d'essai restants (arrondi supérieur), calculé par `../utils/trial`.
   * `null` = inconnu (aucun `trialEnd` lisible) — À NE PAS confondre avec `0`
   * (« l'essai est terminé »). Pour un composant qui exige un nombre
   * (`TrialSidebarCta`), écrivez `trialDaysLeft ?? 0`.
   */
  trialDaysLeft: number | null;
  /** Recharge le statut. Silencieux (sans `loading`) dès qu'un statut est déjà connu. */
  refresh: () => Promise<void>;
  /** Client sous-jacent, pour les usages avancés. Jamais recréé à chaque rendu. */
  billingClient: BillingClient;
  /** `POST /stripe/auto-provision` puis rafraîchissement silencieux. Relance l'erreur. */
  startTrial: () => Promise<void>;
  /** Crée la session Stripe Checkout et y redirige (sauf `redirect: false`). */
  checkout: (
    interval?: 'monthly' | 'annual',
    options?: CheckoutOptions,
  ) => Promise<{ url: string }>;
  /** Ouvre le portail de facturation Stripe et y redirige (sauf `redirect: false`). */
  openPortal: (options?: CheckoutOptions) => Promise<{ url: string }>;
}

export interface SubscriptionProviderProps {
  children: ReactNode;
  /** Clé de l'app côté Manager (`'dialum'`, `'socialum'`, `'webum'`…). */
  appKey: string;
  /** API de facturation du MANAGER (ex. `https://manager.umbeli.com/api`), jamais le backend de l'app. */
  apiBaseUrl: string;
  /**
   * Renvoie un jeton d'accès Supabase valide, ou `null` si la session est perdue.
   * La référence peut changer à chaque rendu : elle est lue via une ref, donc le
   * client n'est PAS recréé (recréer le client à chaque rendu relançait un fetch
   * en boucle — le bug historique de ce provider).
   */
  getAccessToken: () => Promise<string | null>;
  /** Appelé sur un 401 irrécupérable (rediriger vers /auth, vider la session…). */
  onSessionExpired?: () => void;
  /**
   * Consomme l'intention d'essai posée par la landing : `?start_trial=<appKey>`.
   * Le paramètre est retiré de l'URL (`history.replaceState`), l'essai est
   * provisionné AVANT le premier chargement du statut.
   * Passez une chaîne quand la valeur attendue diffère de `appKey`
   * (ex. Anonymum : `startTrialOnIntent="anonymium"`).
   * @default false
   */
  startTrialOnIntent?: boolean | string;
  /** Nom du paramètre d'URL portant l'intention. @default 'start_trial' */
  trialIntentParam?: string;
  /**
   * Rafraîchit le statut au retour d'onglet (focus / visibilitychange), en
   * arrière-plan et sans clignotement de `loading`. Utile après un retour de
   * Stripe dans un autre onglet.
   * @default false
   */
  refreshOnFocus?: boolean;
  /** Anti-rebond du rafraîchissement au focus, en ms. @default 30000 */
  focusDebounceMs?: number;
  /**
   * `false` tant qu'aucun utilisateur n'est authentifié : rien n'est appelé,
   * `loading` retombe à `false` et le statut est vidé. Évite l'erreur
   * « Session invalide » affichée à un visiteur déconnecté.
   * @default true
   */
  enabled?: boolean;
  /** Chaînes visibles par l'utilisateur (défauts FR). */
  labels?: Partial<SubscriptionLabels>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

/** Message d'erreur exploitable, avec repli traduit. */
function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/**
 * Provider d'abonnement canonique de la suite : enveloppe `BillingClient`
 * (UmbeliumManager) et expose le statut, l'essai, le checkout et le portail.
 *
 * - le client est construit une seule fois par couple (`apiBaseUrl`, `appKey`) ;
 * - `loading` est TOUJOURS libéré, même quand la requête échoue : l'échec passe
 *   par `error` et un statut de repli « aucun accès », jamais par un écran de
 *   chargement infini ;
 * - toutes les écritures d'état sont gardées contre le démontage et contre les
 *   réponses périmées (une réponse lente n'écrase jamais une plus récente).
 */
export function SubscriptionProvider({
  children,
  appKey,
  apiBaseUrl,
  getAccessToken,
  onSessionExpired,
  startTrialOnIntent = false,
  trialIntentParam = DEFAULT_TRIAL_INTENT_PARAM,
  refreshOnFocus = false,
  focusDebounceMs = DEFAULT_FOCUS_DEBOUNCE_MS,
  enabled = true,
  labels,
}: SubscriptionProviderProps) {
  const t = useMemo<SubscriptionLabels>(() => ({ ...defaultLabels, ...labels }), [labels]);

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  /** Callbacks lus par ref : leur identité ne doit pas recréer le client. */
  const getAccessTokenRef = useRef(getAccessToken);
  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
    onSessionExpiredRef.current = onSessionExpired;
  }, [getAccessToken, onSessionExpired]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Identifiant de la requête en cours : une réponse périmée est ignorée. */
  const requestIdRef = useRef(0);
  /** Dernier chargement réussi ou tenté, pour l'anti-rebond du focus. */
  const lastLoadAtRef = useRef(0);
  /** Statut courant lu sans redéclarer `refresh` à chaque changement. */
  const subscriptionRef = useRef<SubscriptionStatus | null>(null);
  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);
  /** L'intention d'essai ne se consomme qu'une fois par chargement de page. */
  const intentConsumedRef = useRef(false);

  // Le client n'est recréé que si sa configuration change réellement.
  const billingClient = useMemo<BillingClient>(
    () =>
      createBillingClient({
        apiBaseUrl,
        appKey,
        getAccessToken: () => getAccessTokenRef.current(),
        onSessionExpired: () => onSessionExpiredRef.current?.(),
      }),
    [apiBaseUrl, appKey],
  );

  /**
   * Charge le statut. `background` évite le clignotement de `loading` quand un
   * statut est déjà affiché. Renvoie le statut obtenu, ou `null` en cas d'échec.
   */
  const load = useCallback(
    async (options: { background?: boolean } = {}): Promise<SubscriptionStatus | null> => {
      if (!enabled) {
        if (mountedRef.current) setLoading(false);
        return null;
      }

      const requestId = ++requestIdRef.current;
      lastLoadAtRef.current = Date.now();
      if (!options.background && mountedRef.current) setLoading(true);
      if (mountedRef.current) setError(null);

      try {
        const status = await billingClient.getSubscriptionStatus();
        if (!mountedRef.current || requestId !== requestIdRef.current) return status;
        setSubscription(status);
        setLoading(false);
        return status;
      } catch (err) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return null;
        setError(toMessage(err, t.fetchError));
        // Repli « aucun accès » pour que la porte s'affiche au lieu d'un écran vide.
        setSubscription((prev) => prev ?? FALLBACK_STATUS);
        setLoading(false);
        return null;
      }
    },
    [billingClient, enabled, t.fetchError],
  );

  /** Lit et retire `?start_trial=<valeur>` ; `true` si l'intention était présente. */
  const consumeTrialIntent = useCallback((): boolean => {
    if (!startTrialOnIntent) return false;
    if (intentConsumedRef.current) return false;
    if (typeof window === 'undefined') return false;

    const expected = typeof startTrialOnIntent === 'string' ? startTrialOnIntent : appKey;
    let url: URL;
    try {
      url = new URL(window.location.href);
    } catch {
      return false;
    }
    if (url.searchParams.get(trialIntentParam) !== expected) return false;

    intentConsumedRef.current = true;
    url.searchParams.delete(trialIntentParam);
    try {
      window.history.replaceState(
        {},
        typeof document !== 'undefined' ? document.title : '',
        `${url.pathname}${url.search}${url.hash}`,
      );
    } catch {
      // Certains contextes refusent `replaceState` (iframe sandbox, `file://`,
      // limitation de fréquence Safari). L'intention reste consommée : seule
      // l'URL garde le paramètre. Ne JAMAIS laisser cette erreur remonter — elle
      // remontait dans l'effet de démarrage et laissait `loading` bloqué à true.
    }
    return true;
  }, [startTrialOnIntent, trialIntentParam, appKey]);

  // Chargement initial (et rechargement si la configuration ou l'utilisateur change).
  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1; // invalide toute requête en vol
      setSubscription(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Un effet relancé (changement de config ou d'`enabled`) doit neutraliser le
    // démarrage précédent : sans ce drapeau, un `startTrial` encore en vol
    // relançait `load()` APRÈS le chargement du nouvel effet et écrasait son
    // résultat avec celui de l'ancien client.
    let cancelled = false;

    void (async () => {
      let trialError: string | null = null;

      if (consumeTrialIntent()) {
        if (mountedRef.current) setLoading(true);
        try {
          await billingClient.startTrial();
        } catch (err) {
          trialError = toMessage(err, t.trialError);
        }
        if (cancelled) return;
      }

      const status = await load();

      // L'erreur d'essai n'est montrée que si l'accès n'a finalement pas été ouvert.
      if (
        trialError &&
        !cancelled &&
        mountedRef.current &&
        !(status && billingClient.isAccessGranted(status))
      ) {
        setError(trialError);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, billingClient, consumeTrialIntent, load, t.trialError]);

  // Rafraîchissement au retour d'onglet, en arrière-plan et anti-rebondi.
  useEffect(() => {
    if (!refreshOnFocus || !enabled) return;
    if (typeof window === 'undefined') return;

    const onBack = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastLoadAtRef.current < focusDebounceMs) return;
      void load({ background: true });
    };

    window.addEventListener('focus', onBack);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onBack);
    return () => {
      window.removeEventListener('focus', onBack);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onBack);
    };
  }, [refreshOnFocus, enabled, focusDebounceMs, load]);

  const refresh = useCallback(async () => {
    // Silencieux dès qu'un statut est affiché : pas de plein écran de chargement.
    await load({ background: subscriptionRef.current != null });
  }, [load]);

  const hasActiveSubscription = useCallback((): boolean => {
    if (!subscription) return false;
    return billingClient.isAccessGranted(subscription);
  }, [subscription, billingClient]);

  const startTrial = useCallback(async () => {
    if (mountedRef.current) setError(null);
    try {
      await billingClient.startTrial();
    } catch (err) {
      const message = toMessage(err, t.trialError);
      if (mountedRef.current) setError(message);
      throw err instanceof Error ? err : new Error(message);
    }
    await load({ background: true });
  }, [billingClient, load, t.trialError]);

  const checkout = useCallback(
    async (
      interval: 'monthly' | 'annual' = 'monthly',
      options: CheckoutOptions = {},
    ): Promise<{ url: string }> => {
      if (mountedRef.current) setError(null);
      try {
        const result = await billingClient.createCheckoutSession(interval, options.returnUrl);
        if (options.redirect !== false && typeof window !== 'undefined') {
          window.location.href = result.url;
        }
        return result;
      } catch (err) {
        const message = toMessage(err, t.checkoutError);
        if (mountedRef.current) setError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [billingClient, t.checkoutError],
  );

  const openPortal = useCallback(
    async (options: CheckoutOptions = {}): Promise<{ url: string }> => {
      if (mountedRef.current) setError(null);
      try {
        const result = await billingClient.openBillingPortal(options.returnUrl);
        if (options.redirect !== false && typeof window !== 'undefined') {
          window.location.href = result.url;
        }
        return result;
      } catch (err) {
        const message = toMessage(err, t.portalError);
        if (mountedRef.current) setError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [billingClient, t.portalError],
  );

  const isTrialing = subscription?.status === 'trialing';
  const daysLeft = computeTrialDaysLeft(subscription);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      loading,
      error,
      hasActiveSubscription,
      isTrialing,
      trialDaysLeft: daysLeft,
      refresh,
      billingClient,
      startTrial,
      checkout,
      openPortal,
    }),
    [
      subscription,
      loading,
      error,
      hasActiveSubscription,
      isTrialing,
      daysLeft,
      refresh,
      billingClient,
      startTrial,
      checkout,
      openPortal,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/**
 * Accès au contexte d'abonnement.
 * @throws si appelé hors d'un `<SubscriptionProvider>`.
 */
export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription doit être utilisé à l'intérieur d'un <SubscriptionProvider>");
  }
  return context;
}
