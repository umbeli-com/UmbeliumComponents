/**
 * Shared billing client for all Umbeli SaaS apps.
 * Talks to UmbeliumManager's Stripe API endpoints.
 *
 * Usage:
 *   const billing = createBillingClient({
 *     apiBaseUrl: 'https://manager.umbeli.com/api',
 *     appKey: 'dialum',
 *     getAccessToken: () => supabase.auth.getSession().then(s => s.data.session?.access_token),
 *   });
 *
 *   const status = await billing.getSubscriptionStatus();
 *   await billing.startTrial();
 *
 * MODÈLE PER-APP (contrat Manager 2026-08) : chaque SaaS a SON abonnement.
 *   await billing.appCheckout({ interval: 'annual', upgradeNow: true }); // POST /stripe/app-checkout
 * `createCheckoutSession` (POST /stripe/workspace-checkout, modèle paquet
 * d'apps) reste EN PLACE et inchangé : les deux routes coexistent côté Manager.
 */

/** Intervalle de facturation accepté par le Manager. */
export type BillingInterval = 'monthly' | 'annual';

/**
 * Statuts d'abonnement renvoyés par le Manager.
 * `'inactive'` est la variante historique de `'none'` : plusieurs apps
 * (Anonymum, Monitorum, Dialum) la renvoient comme repli et au moins un
 * AuthContext la relit LITTÉRALEMENT — d'où sa présence ici, aux côtés de
 * `'none'`. `../utils/trial` connaît déjà les deux (`SubscriptionStatusKey`).
 *
 * ATTENTION, c'est le SEUL élargissement de ce fichier qui soit visible en
 * SORTIE (`getSubscriptionStatus`) et donc covariant : une app qui réassigne le
 * statut du client à son propre littéral d'union (sans `'inactive'`) ou qui
 * tient un `Record<SubscriptionStatus['status'], …>` exhaustif cesserait de
 * compiler. Vérifié sur l'arbre : aucune app ne le fait — toutes déclarent
 * `status: string` (Anonymum, Dialum, Monitorum, Webum, Socialum, Scrapium,
 * Noesium), et les seuls Record exhaustifs vivent dans `../utils/trial`, dont
 * la clé porte déjà `'inactive'`. À revérifier avant d'ajouter une valeur.
 */
export type SubscriptionStatusValue =
  | 'none'
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export interface SubscriptionStatus {
  plan: string;
  status: SubscriptionStatusValue;
  periodEnd: string | null;
  trialEnd?: string | null;
  accessBlocked?: boolean;
  hasUsedTrial?: boolean;
  selectedApps?: string[];
  /**
   * L'abonnement est programmé pour s'arrêter à la fin de la période : c'est ce
   * drapeau qui fait basculer le bouton « Annuler » → « Réactiver ». Sans lui
   * les apps devaient relire `GET /stripe/subscription` à côté du client
   * (Webum/apps/admin/src/lib/managerBilling.ts).
   */
  cancelAtPeriodEnd?: boolean;
  /** Un abonnement Stripe est déjà rattaché à l'espace (carte enregistrée). */
  hasStripeSubscription?: boolean;
  /** Détail du paquet côté Manager (apps du workspace, intervalle, tarif). */
  planDetails?: SubscriptionPlanDetails | null;
}

/** `planDetails` du Manager — champs stables, le reste passe tel quel. */
export interface SubscriptionPlanDetails {
  selectedApps?: string[];
  billingInterval?: string;
  bundleDiscount?: number;
  pricing?: unknown;
}

/**
 * Enregistrement d'abonnement BRUT du Manager, tel que
 * `GET /stripe/subscription` le renvoie — sans le rabotage de
 * `getSubscriptionStatus`. Remplace les `RawSubscription` recopiés dans
 * Anonymum, Dialum et Webum.
 */
export interface RawSubscription {
  /**
   * `null` est une valeur RÉELLE du Manager (`stripe.service.js` remet
   * `plan: null` à la résiliation) — les copies locales d'Anonymum, Dialum et
   * Webum déclarent `plan: string`, donc leur remplacement par ce type oblige à
   * traiter le cas nul au lieu de le supposer absent.
   */
  plan: string | null;
  status: string;
  periodEnd?: string | null;
  trialEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  hasUsedTrial?: boolean;
  hasStripeSubscription?: boolean;
  accessBlocked?: boolean;
  selectedApps?: string[];
  planDetails?: SubscriptionPlanDetails | null;
  /** Essais déjà consommés, par clé d'app (modèle per-app). */
  trialUsage?: Record<string, boolean>;
  /** Période de grâce après un échec de paiement. */
  gracePeriod?: { paymentFailedAt?: string | null; failureCount?: number } | null;
}

/** Espace de travail courant, tel que `GET /users/me` le connaît. */
export interface BillingTenant {
  /** `tenantId` attendu par les routes `/stripe/*`. */
  id: string;
  /** Nom affichable, `null` quand le Manager ne le renvoie pas. */
  name: string | null;
}

/**
 * Jeton d'accès : soit un callback (le cas historique — le client redemande un
 * jeton frais à chaque appel), soit un jeton DÉJÀ RÉSOLU. Les services locaux
 * des apps (Anonymum, Dialum, Monitorum…) reçoivent l'`accessToken` en
 * paramètre : sans cette seconde forme il fallait le réemballer dans une
 * closure à chaque fonction.
 */
export type BillingAccessTokenSource =
  | string
  | null
  | (() => string | null | Promise<string | null>);

/** Chaînes visibles par l'utilisateur (portées par les `Error` levées). */
export interface BillingClientLabels {
  /** Aucun jeton disponible : la session est perdue avant même l'appel. */
  sessionInvalid: string;
  /** Le serveur a répondu 401. */
  sessionExpired: string;
  /** `apiBaseUrl` est vide alors que l'appel exige le Manager. */
  notConfigured: string;
  /** Réponse de checkout sans `url`. */
  missingCheckoutUrl: string;
  /** Réponse du portail sans `url`. */
  missingPortalUrl: string;
  /** Échec HTTP sans message serveur — `{status}` est remplacé par le code. */
  requestFailed: string;
}

/** Défauts FR — valeurs HISTORIQUES, à ne jamais changer sans le savoir. */
const defaultLabels: BillingClientLabels = {
  sessionInvalid: 'Session invalide, reconnectez-vous.',
  sessionExpired: 'Session expiree, reconnectez-vous.',
  notConfigured: 'Billing API non configuree.',
  missingCheckoutUrl: 'URL de paiement manquante dans la reponse.',
  missingPortalUrl: 'URL du portail manquante dans la reponse.',
  requestFailed: 'Request failed ({status})',
};

export interface BillingClientConfig {
  /** UmbeliumManager API base URL (e.g. https://manager.umbeli.com/api) */
  apiBaseUrl: string;
  /** This app's key (e.g. 'dialum', 'socialum', 'noesium') */
  appKey: string;
  /**
   * Jeton d'accès Supabase : callback (rappelé à chaque requête) OU jeton déjà
   * résolu. `null` / un callback qui rend `null` = session perdue.
   */
  getAccessToken: BillingAccessTokenSource;
  /** Called when session is unrecoverable (e.g. redirect to /auth) */
  onSessionExpired?: () => void;
  /**
   * Rejoue UNE fois la requête avec un jeton frais quand le Manager répond 401
   * (`supabase.auth.refreshSession()` côté app — le `fetchWithAuth` de
   * Monitorum). Rendre `null` (ou lever) = session morte : `onSessionExpired`
   * est appelé et l'erreur remonte, exactement comme sans cette option.
   * Non fourni → comportement historique, aucun réessai.
   */
  refreshAccessToken?: () => string | null | Promise<string | null>;
  /**
   * Statut rendu par `getSubscriptionStatus()` quand `apiBaseUrl` est vide
   * (facturation non configurée). Les apps ne s'accordent pas : le paquet
   * répond `'none'`, Anonymum/Monitorum/Dialum répondent `'inactive'`, et au
   * moins un AuthContext compare cette sentinelle littéralement.
   * @default 'none'
   */
  unconfiguredStatus?: SubscriptionStatusValue;
  /** Chaînes visibles par l'utilisateur (défauts FR). */
  labels?: Partial<BillingClientLabels>;
}

/**
 * Objet abonnement TOLÉRÉ par `isAccessGranted` : les apps gardent souvent leur
 * propre type (`status: string` libre, hérité de leur service local) et le
 * passaient à un client qui exigeait l'union stricte. Tous les champs sont
 * optionnels : seuls `status` et `accessBlocked` sont lus.
 */
export interface SubscriptionStatusLike {
  status?: string | null;
  accessBlocked?: boolean | null;
  plan?: string | null;
  periodEnd?: string | null;
  trialEnd?: string | null;
  hasUsedTrial?: boolean;
  cancelAtPeriodEnd?: boolean;
  hasStripeSubscription?: boolean;
  selectedApps?: string[];
  planDetails?: unknown;
}

/** Options communes aux appels qui ciblent un workspace précis. */
export interface TenantScopedOptions {
  /**
   * Workspace ciblé. Omis → le Manager retombe sur
   * `user_profiles.current_tenant_id`. `null` → ne rien envoyer.
   */
  tenantId?: string | null;
}

export interface AppCheckoutOptions extends TenantScopedOptions {
  /** @default 'monthly' */
  interval?: BillingInterval;
  /**
   * Workspace ciblé. Omis → résolu via `getCurrentTenant()` (GET /users/me),
   * comme le font déjà les apps. `null` → aucune résolution, aucun `tenantId`
   * envoyé (le Manager prend alors le workspace courant du profil).
   */
  tenantId?: string | null;
  /**
   * Passage au payant PENDANT l'essai : le 1er cycle est débité à la validation
   * Stripe et le débit suivant est repoussé des jours d'essai restants.
   * @default false
   */
  upgradeNow?: boolean;
  /** URL de retour Stripe. Défaut : la page in-app courante. */
  returnUrl?: string;
  /** URL d'annulation Stripe. Défaut : `returnUrl` (la distinguer permet à la
   *  page de retour de séparer paiement confirmé et abandon). */
  cancelUrl?: string;
  /**
   * Champs supplémentaires du corps, pour les besoins propres à une app
   * (Webum envoie `currency` et `locale`). Les champs canoniques du contrat
   * (`appKey`, `billingInterval`, `tenantId`, `successUrl`, `cancelUrl`,
   * `upgradeNow`) ne peuvent PAS être écrasés par ce biais : ils sont RETIRÉS
   * de `extraFields` avant l'étalement, et pas seulement recouverts — un
   * recouvrement ne tient que sur les branches où le champ canonique est
   * effectivement émis (`upgradeNow` est omis quand il vaut `false`, `tenantId`
   * quand il est nul, `successUrl`/`cancelUrl` quand aucune URL de retour n'est
   * résolue), donc la valeur de l'appelant passait sur toutes les autres.
   */
  extraFields?: Record<string, unknown>;
}

/**
 * Champs du corps de `/stripe/app-checkout` que le client possède seul :
 * `extraFields` ne peut jamais les porter (cf. `AppCheckoutOptions.extraFields`).
 */
const CANONICAL_APP_CHECKOUT_FIELDS = [
  'tenantId',
  'appKey',
  'billingInterval',
  'upgradeNow',
  'successUrl',
  'cancelUrl',
] as const;

/**
 * Réponse de `POST /stripe/app-checkout` — contrat Manager 2026-08 : elle porte
 * TOUJOURS `url` (session Stripe Checkout hébergée), carte enregistrée ou non.
 * L'app redirige vers `url`, inconditionnellement (cas « déjà actif » :
 * `url` vaut la `successUrl` envoyée).
 */
export interface AppCheckoutResult {
  url: string;
  /** L'abonnement était déjà actif : rien n'a été débité. */
  alreadyActive?: boolean;
  status?: string;
  appKey?: string;
  /** Session Stripe Checkout — chemin hébergé uniquement. */
  sessionId?: string;
  /**
   * Abonnement Stripe concerné — renvoyé à la place de `sessionId` sur les
   * chemins « rien à payer » du Manager (`alreadyActive`, reprise d'un
   * abonnement à plat, débit en 1 clic `instant`).
   */
  subscriptionId?: string;
  /** `false` sur le chemin hébergé normal. */
  paid?: boolean;
}

export interface CancelOptions extends TenantScopedOptions {
  /**
   * `true` = résiliation immédiate. `false` (défaut) = à la fin de la période :
   * l'accès est conservé jusqu'à `periodEnd` et `cancelAtPeriodEnd` passe à
   * `true`.
   * @default false
   */
  immediately?: boolean;
}

export type ResumeOptions = TenantScopedOptions;

/** Réponse des actions d'abonnement (`/stripe/cancel`, `/stripe/resume`). */
export interface BillingActionResult {
  success?: boolean;
  canceledImmediately?: boolean;
  scheduledCancel?: boolean;
  alreadyCanceled?: boolean;
  noSubscriptionFound?: boolean;
  cleanedUp?: boolean;
  resumedTrial?: boolean;
}

export interface BillingClient {
  getSubscriptionStatus: () => Promise<SubscriptionStatus>;
  /**
   * Enregistrement BRUT de `GET /stripe/subscription` (avec `cancelAtPeriodEnd`,
   * `trialUsage`, `gracePeriod`…). Ne lève jamais : `null` si la facturation
   * n'est pas configurée ou si le Manager refuse.
   */
  getRawSubscription: () => Promise<RawSubscription | null>;
  /**
   * Espace de travail courant (`GET /users/me`) — la cible `tenantId` des
   * routes `/stripe/*`. Ne lève jamais : `null` quand il est introuvable
   * (`onSessionExpired` reste déclenché sur un 401).
   */
  getCurrentTenant: () => Promise<BillingTenant | null>;
  startTrial: () => Promise<void>;
  /** returnUrl: where Stripe sends the user back after checkout. Defaults to the
   *  current in-app page so the user never lands on the Manager. */
  createCheckoutSession: (billingInterval: BillingInterval, returnUrl?: string) => Promise<{ url: string }>;
  /**
   * Checkout PER-APP (`POST /stripe/app-checkout`) : un abonnement par SaaS.
   * C'est la route de la suite depuis 2026-08. Le checkout « paquet d'apps »
   * (`createCheckoutSession`) n'a AUCUNE issue pour une app déjà installée :
   * sans `tenantId` le Manager répond 400 (« workspaceName is required when no
   * existing workspace is selected »), et avec un `tenantId` déjà porteur d'un
   * abonnement Stripe il répond 409.
   */
  appCheckout: (options?: AppCheckoutOptions) => Promise<AppCheckoutResult>;
  /** returnUrl: where Stripe's billing portal sends the user back. Defaults to the
   *  current in-app page so the user never lands on the Manager. */
  openBillingPortal: (returnUrl?: string) => Promise<{ url: string }>;
  /** `POST /stripe/cancel` — par défaut à la fin de la période (accès conservé). */
  cancel: (options?: CancelOptions) => Promise<BillingActionResult>;
  /** `POST /stripe/resume` — réabonnement d'un abonnement programmé pour s'arrêter. */
  resume: (options?: ResumeOptions) => Promise<BillingActionResult>;
  /** Returns true if status is 'active' or 'trialing' and not blocked */
  isAccessGranted: (status: SubscriptionStatus | SubscriptionStatusLike) => boolean;
}

/** The URL Stripe should return to. Defaults to the current in-app page so the
 *  user stays in-app instead of bouncing to the Manager's own domain. */
function resolveReturnUrl(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (typeof window !== 'undefined' && window.location?.href) return window.location.href;
  return undefined;
}

/**
 * Fusionne une surcharge partielle de copie SANS laisser passer les `undefined`
 * explicites (même règle que `../utils/trial`) : `labels={{ notConfigured:
 * t('billing.unset') }}` où `t` rend `undefined` doit garder le défaut, pas
 * afficher « undefined » dans une alerte de paiement.
 */
function mergeLabels(overrides?: Partial<BillingClientLabels>): BillingClientLabels {
  if (!overrides) return defaultLabels;

  const merged = { ...defaultLabels };
  for (const key of Object.keys(overrides) as (keyof BillingClientLabels)[]) {
    const value = overrides[key];
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

/** Jeton courant, que la config porte un callback ou un jeton déjà résolu. */
async function resolveAccessToken(source: BillingAccessTokenSource): Promise<string | null> {
  if (typeof source === 'function') return (await source()) ?? null;
  return source ?? null;
}

export function createBillingClient(config: BillingClientConfig): BillingClient {
  const {
    apiBaseUrl,
    appKey,
    getAccessToken,
    onSessionExpired,
    refreshAccessToken,
    unconfiguredStatus = 'none',
  } = config;
  const t = mergeLabels(config.labels);

  async function readError(response: Response): Promise<string> {
    const fallback = t.requestFailed.replace('{status}', String(response.status));
    try {
      const body = await response.json();
      return body?.error || body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  function buildHeaders(token: string, init: RequestInit): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    };
  }

  async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await resolveAccessToken(getAccessToken);
    if (!token) {
      throw new Error(t.sessionInvalid);
    }

    let response = await fetch(url, { ...init, headers: buildHeaders(token, init) });

    if (response.status === 401 && refreshAccessToken) {
      // Un seul réessai : le jeton a expiré pendant la session, l'app sait le
      // renouveler (refreshSession). Un 401 qui persiste = session morte.
      let fresh: string | null = null;
      try {
        fresh = (await refreshAccessToken()) ?? null;
      } catch {
        fresh = null;
      }
      if (fresh) {
        response = await fetch(url, { ...init, headers: buildHeaders(fresh, init) });
      }
    }

    if (response.status === 401) {
      onSessionExpired?.();
      throw new Error(t.sessionExpired);
    }

    return response;
  }

  /** Profil Manager brut. Ne lève jamais : `null` dès que la lecture échoue. */
  async function fetchManagerProfile(): Promise<Record<string, unknown> | null> {
    if (!apiBaseUrl) return null;
    try {
      const response = await authFetch(`${apiBaseUrl}/users/me`);
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  const client: BillingClient = {
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
      if (!apiBaseUrl) {
        return { plan: 'free', status: unconfiguredStatus, periodEnd: null };
      }

      const params = new URLSearchParams({ appKey });
      const response = await authFetch(`${apiBaseUrl}/stripe/subscription?${params}`);

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = await response.json();
      const sub = payload?.subscription || payload;

      return {
        plan: sub?.plan ?? 'free',
        status: sub?.status ?? 'none',
        periodEnd: sub?.periodEnd ?? null,
        trialEnd: sub?.trialEnd ?? null,
        accessBlocked: sub?.accessBlocked ?? false,
        hasUsedTrial: sub?.hasUsedTrial ?? false,
        selectedApps: sub?.planDetails?.selectedApps ?? [],
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd === true,
        hasStripeSubscription: sub?.hasStripeSubscription === true,
        planDetails: sub?.planDetails ?? null,
      };
    },

    async getRawSubscription(): Promise<RawSubscription | null> {
      if (!apiBaseUrl) return null;

      try {
        const params = new URLSearchParams({ appKey });
        const response = await authFetch(`${apiBaseUrl}/stripe/subscription?${params}`);
        if (!response.ok) return null;
        const payload = await response.json().catch(() => null);
        const sub = payload?.subscription ?? payload;
        return sub && typeof sub === 'object' ? (sub as RawSubscription) : null;
      } catch {
        return null;
      }
    },

    async getCurrentTenant(): Promise<BillingTenant | null> {
      const profile = await fetchManagerProfile();
      if (!profile) return null;

      // Le Manager renvoie `currentTenant` + `tenant_id` + `current_tenant_id`
      // + `workspaces` (workspace-context.service.js). Les apps lisent l'un ou
      // l'autre — dont un `currentWorkspace` défensif côté Monitorum.
      const currentTenant = profile.currentTenant as { id?: string; name?: string | null } | null | undefined;
      const currentWorkspace = profile.currentWorkspace as { id?: string; name?: string | null } | null | undefined;
      const workspaces = Array.isArray(profile.workspaces)
        ? (profile.workspaces as { id?: string; name?: string | null }[])
        : [];
      const first = workspaces[0];

      const id =
        currentTenant?.id
        ?? currentWorkspace?.id
        ?? (typeof profile.tenant_id === 'string' ? profile.tenant_id : undefined)
        ?? (typeof profile.current_tenant_id === 'string' ? profile.current_tenant_id : undefined)
        ?? first?.id
        ?? null;

      if (!id) return null;

      const named = [currentTenant, currentWorkspace, first].find((w) => w?.id === id);
      return { id, name: named?.name ?? null };
    },

    async startTrial(): Promise<void> {
      if (!apiBaseUrl) {
        throw new Error(t.notConfigured);
      }

      const response = await authFetch(`${apiBaseUrl}/stripe/auto-provision`, {
        method: 'POST',
        body: JSON.stringify({ sourceApps: [appKey] }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }
    },

    async createCheckoutSession(billingInterval: BillingInterval, returnUrl?: string): Promise<{ url: string }> {
      if (!apiBaseUrl) {
        throw new Error(t.notConfigured);
      }

      const ret = resolveReturnUrl(returnUrl);
      const response = await authFetch(`${apiBaseUrl}/stripe/workspace-checkout`, {
        method: 'POST',
        body: JSON.stringify({
          selectedApps: [appKey],
          billingInterval,
          ...(ret ? { successUrl: ret, cancelUrl: ret } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error(t.missingCheckoutUrl);
      }
      return { url: payload.url };
    },

    async appCheckout(options: AppCheckoutOptions = {}): Promise<AppCheckoutResult> {
      if (!apiBaseUrl) {
        throw new Error(t.notConfigured);
      }

      // `tenantId` absent → le résoudre, comme les apps : sans workspace
      // explicite le Manager retombe sur `current_tenant_id` et répond 400
      // « No workspace available » quand il n'y en a pas.
      const tenantId = options.tenantId === undefined
        ? (await client.getCurrentTenant())?.id ?? null
        : options.tenantId;

      const ret = resolveReturnUrl(options.returnUrl);
      // `cancelUrl` est INDÉPENDANT de `successUrl` : une app qui ne fournit
      // qu'un `cancelUrl` (hors navigateur, ou retour de succès laissé au
      // défaut du Manager) le voyait disparaître silencieusement du corps.
      const cancelUrl = options.cancelUrl ?? ret;

      // `extraFields` est étalé en premier ET amputé des champs canoniques :
      // les recouvrir ne suffit pas, puisque plusieurs d'entre eux ne sont pas
      // émis du tout dans le cas par défaut (`upgradeNow: false`, `tenantId`
      // nul, aucune URL de retour). Sans ce filtrage, un `upgradeNow: true`
      // resté dans `extraFields` déclenchait un débit immédiat pendant l'essai
      // et un `tenantId` y traînant facturait un AUTRE espace de travail.
      const extraFields: Record<string, unknown> = { ...(options.extraFields ?? {}) };
      for (const key of CANONICAL_APP_CHECKOUT_FIELDS) delete extraFields[key];

      const response = await authFetch(`${apiBaseUrl}/stripe/app-checkout`, {
        method: 'POST',
        body: JSON.stringify({
          ...extraFields,
          ...(tenantId ? { tenantId } : {}),
          appKey,
          billingInterval: options.interval ?? 'monthly',
          ...(options.upgradeNow ? { upgradeNow: true } : {}),
          ...(ret ? { successUrl: ret } : {}),
          ...(cancelUrl ? { cancelUrl } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error(t.missingCheckoutUrl);
      }
      return {
        url: payload.url,
        alreadyActive: payload.alreadyActive === true,
        status: payload.status,
        appKey: payload.appKey,
        sessionId: payload.sessionId,
        subscriptionId: payload.subscriptionId,
        paid: payload.paid === true,
      };
    },

    async openBillingPortal(returnUrl?: string): Promise<{ url: string }> {
      if (!apiBaseUrl) {
        throw new Error(t.notConfigured);
      }

      const ret = resolveReturnUrl(returnUrl);
      const response = await authFetch(`${apiBaseUrl}/stripe/portal`, {
        method: 'POST',
        body: JSON.stringify(ret ? { returnUrl: ret } : {}),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error(t.missingPortalUrl);
      }
      return { url: payload.url };
    },

    async cancel(options: CancelOptions = {}): Promise<BillingActionResult> {
      if (!apiBaseUrl) {
        throw new Error(t.notConfigured);
      }

      const response = await authFetch(`${apiBaseUrl}/stripe/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          immediately: options.immediately === true,
          ...(options.tenantId ? { tenantId: options.tenantId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      return (await response.json().catch(() => ({}))) as BillingActionResult;
    },

    async resume(options: ResumeOptions = {}): Promise<BillingActionResult> {
      if (!apiBaseUrl) {
        throw new Error(t.notConfigured);
      }

      const response = await authFetch(`${apiBaseUrl}/stripe/resume`, {
        method: 'POST',
        body: JSON.stringify(options.tenantId ? { tenantId: options.tenantId } : {}),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      return (await response.json().catch(() => ({}))) as BillingActionResult;
    },

    isAccessGranted(status: SubscriptionStatus | SubscriptionStatusLike): boolean {
      if (status.accessBlocked) return false;
      return status.status === 'active' || status.status === 'trialing';
    },
  };

  return client;
}
