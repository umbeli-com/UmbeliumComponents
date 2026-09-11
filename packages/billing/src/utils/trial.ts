/**
 * Helpers d'affichage essai + abonnement — SOURCE UNIQUE de la suite.
 *
 * Fonctions pures : aucune dépendance, aucun React, aucun accès DOM. Le fichier
 * est importable côté client léger (`@umbeli-com/billing/trial`) comme côté
 * serveur/worker, sans tirer l'arbre de composants du paquet.
 *
 * Pourquoi ce fichier : huit apps avaient réécrit `trialDaysLeft` (Webum,
 * Dialum, Socialum, Anonymum ×2, Monitorum, Profilum ×2). Toutes arrondissaient
 * au jour SUPÉRIEUR avec plancher 0 — l'accord est unanime sur ce point — mais
 * elles divergeaient sur la sentinelle « inconnu » (0 chez Webum/Socialum et
 * l'extension Anonymum, `null` ailleurs) et sur le champ lu (`trialEnd` seul,
 * ou `trialEnd ?? trialEndsAt` chez Profilum). C'est cette divergence qui
 * faisait afficher « 1 jour restant » à des bannières dont l'essai était en
 * réalité inconnu. Règle retenue ici : `null` = inconnu, `0` = essai terminé.
 *
 * Toute chaîne visible par l'utilisateur a un défaut FR et reste surchargeable
 * via `labels` (convention maison : cf. `labels` de TrialSidebarCta).
 */

import type { SubscriptionStatus } from './BillingClient';

const DAY_MS = 86_400_000;

/** Seuil epoch : au-delà, un nombre est déjà en millisecondes (≈ an 5138 en s). */
const EPOCH_SECONDS_MAX = 1e11;

/** Langue de la copie livrée par ce module. Défaut suite : français. */
export type BillingLocale = 'fr' | 'en';

/**
 * N'importe quel objet abonnement de la suite : les apps nomment la fin d'essai
 * `trialEnd` (canonique Manager), `trialEndsAt` (payload legacy Profilum) ou
 * `trial_end` (objet Stripe brut — epoch en SECONDES, comme le convertit le
 * Manager : `new Date(subscription.trial_end * 1000)`).
 */
export interface TrialEndSource {
  trialEnd?: string | Date | number | null;
  trialEndsAt?: string | Date | number | null;
  trial_end?: string | Date | number | null;
}

/** Entrées acceptées par `trialDaysLeft`. */
export type TrialDaysLeftInput =
  | SubscriptionStatus
  | TrialEndSource
  | string
  | Date
  | number
  | null
  | undefined;

/** Millisecondes epoch de la fin d'essai, ou `null` si absente/invalide. */
function toEpochMs(value: string | Date | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // `trial_end` de Stripe est en secondes ; un timestamp JS est en ms.
    return Math.abs(value) < EPOCH_SECONDS_MAX ? value * 1000 : value;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Extrait la fin d'essai d'une entrée quelconque. Exportée pour les tests. */
export function resolveTrialEnd(source: TrialDaysLeftInput): number | null {
  if (source === null || source === undefined) return null;

  if (typeof source === 'string' || typeof source === 'number' || source instanceof Date) {
    return toEpochMs(source);
  }

  const record = source as TrialEndSource;
  // Premier champ EXPLOITABLE, et non simplement premier champ non-nullish : un
  // `trialEnd: ''` (le Manager renvoie la chaîne vide quand Stripe n'a pas encore
  // posé la date) ne doit pas masquer le `trialEndsAt` legacy que les payloads
  // Profilum envoient à côté. `??` sur les valeurs brutes s'arrêtait sur `''`.
  return toEpochMs(record.trialEnd) ?? toEpochMs(record.trialEndsAt) ?? toEpochMs(record.trial_end);
}

/**
 * Jours d'essai restants — arrondi SUPÉRIEUR, plancher 0, `null` si inconnu.
 *
 * - Accepte l'objet abonnement complet, une date ISO, un `Date`, un epoch
 *   (secondes façon Stripe ou millisecondes) ou `null`.
 * - Lit `trialEnd ?? trialEndsAt ?? trial_end`.
 * - `null` signifie « on ne sait pas » (champ absent ou date illisible) et NE
 *   doit pas être confondu avec `0` (« l'essai est terminé ») : c'est la
 *   confusion qui faisait diverger les bannières d'essai entre apps.
 * - `now` est injectable pour rendre le calcul testable (Date.now() par défaut).
 *
 * Exemple : essai finissant dans 3 jours et 1 seconde → 4.
 */
export function trialDaysLeft(source: TrialDaysLeftInput, now: number = Date.now()): number | null {
  const end = resolveTrialEnd(source);
  if (end === null) return null;

  const reference = Number.isFinite(now) ? now : Date.now();
  return Math.max(0, Math.ceil((end - reference) / DAY_MS));
}

/**
 * Fusionne une surcharge partielle de copie SANS laisser passer les `undefined`
 * explicites. Un spread nu (`{ ...defaults, ...labels }`) écrase le défaut dès
 * que l'app passe une clé i18n absente (`labels={{ zero: t('trial.zero') }}` où
 * `t` rend `undefined`) : le composant affiche alors littéralement « undefined ».
 */
function mergeCopy<T extends object>(base: T, overrides?: Partial<T>): T {
  if (!overrides) return base;

  const merged = { ...base };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const value = overrides[key];
    if (value !== undefined) merged[key] = value as T[keyof T];
  }
  return merged;
}

/** Copie du libellé d'essai (défauts FR — copie canonique Webum/TrialSidebarCta). */
export interface TrialLabelCopy {
  /** `daysLeft === null` → essai en cours, échéance inconnue. */
  unknown: string;
  /** `daysLeft === 0` → l'essai est arrivé à terme. */
  zero: string;
  /** `daysLeft === 1`. */
  one: string;
  /** `daysLeft >= 2`. */
  many: (days: number) => string;
}

export interface TrialLabelOptions {
  /** 'fr' (défaut) ou 'en' ; une locale complète ('en-CA') est acceptée. */
  locale?: BillingLocale | string;
  /** Surcharge partielle de la copie (i18n de l'app). */
  labels?: Partial<TrialLabelCopy>;
}

const TRIAL_COPY: Record<BillingLocale, TrialLabelCopy> = {
  fr: {
    unknown: 'Essai en cours',
    zero: 'Essai terminé',
    one: 'Essai — 1 jour restant',
    many: (days: number) => `Essai — ${days} jours restants`,
  },
  en: {
    unknown: 'Trial in progress',
    zero: 'Trial ended',
    one: 'Trial — 1 day left',
    many: (days: number) => `Trial — ${days} days left`,
  },
};

/** 'fr-CA' → 'fr' ; tout ce qui n'est pas anglais retombe sur le français. */
function normalizeLocale(locale?: BillingLocale | string): BillingLocale {
  return typeof locale === 'string' && locale.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/**
 * « Essai — 3 jours restants » / « Essai — 1 jour restant » / « Essai terminé ».
 * `null` (inconnu) donne un libellé générique plutôt qu'un faux décompte.
 */
export function formatTrialLabel(days: number | null | undefined, options: TrialLabelOptions = {}): string {
  const copy = mergeCopy(TRIAL_COPY[normalizeLocale(options.locale)], options.labels);

  if (days === null || days === undefined || !Number.isFinite(days)) return copy.unknown;

  const whole = Math.max(0, Math.floor(days));
  if (whole === 0) return copy.zero;
  if (whole === 1) return copy.one;
  return copy.many(whole);
}

/** Ton sémantique du badge de statut — mappé sur les variables de thème. */
export type SubscriptionStatusTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface SubscriptionStatusMeta {
  /** Ton du badge : primary=essai, success=actif, warning=impayé, danger=résilié/expiré, neutral=aucun. */
  tone: SubscriptionStatusTone;
  /** Libellé prêt à afficher (FR par défaut). */
  label: string;
  /** L'accès applicatif est ouvert (actif OU en essai) — cf. `isAccessGranted`. */
  isActive: boolean;
  isTrialing: boolean;
  /** L'abonnement a existé et s'est cassé : l'utilisateur doit agir. */
  needsAction: boolean;
}

/** Clés de statut connues du Manager (+ 'inactive', variante historique). */
export type SubscriptionStatusKey =
  | SubscriptionStatus['status']
  | 'inactive';

export type SubscriptionStatusLabels = Partial<Record<SubscriptionStatusKey, string>>;

export interface SubscriptionStatusMetaOptions {
  locale?: BillingLocale | string;
  labels?: SubscriptionStatusLabels;
}

const STATUS_TONE: Record<SubscriptionStatusKey, SubscriptionStatusTone> = {
  trialing: 'primary',
  active: 'success',
  past_due: 'warning',
  canceled: 'danger',
  expired: 'danger',
  inactive: 'neutral',
  none: 'neutral',
};

const STATUS_COPY: Record<BillingLocale, Record<SubscriptionStatusKey, string>> = {
  fr: {
    trialing: 'Essai en cours',
    active: 'Actif',
    past_due: 'Paiement en retard',
    canceled: 'Résilié',
    expired: 'Expiré',
    inactive: 'Aucun abonnement',
    none: 'Aucun abonnement',
  },
  en: {
    trialing: 'Trial',
    active: 'Active',
    past_due: 'Payment overdue',
    canceled: 'Canceled',
    expired: 'Expired',
    inactive: 'No subscription',
    none: 'No subscription',
  },
};

/** Statuts pour lesquels l'utilisateur doit intervenir pour retrouver l'accès. */
const NEEDS_ACTION = new Set<SubscriptionStatusKey>(['past_due', 'canceled', 'expired']);

/**
 * `key in STATUS_TONE` remonterait la chaîne de prototypes : un statut
 * `'constructor'` ou `'__proto__'` (chaîne quelconque venue de l'API) passait
 * pour un statut connu et rendait `tone` égal à une fonction / `Object.prototype`,
 * donc un badge sans classe et un `label` non affichable. On teste la clé PROPRE.
 */
function isKnownStatus(key: string): key is SubscriptionStatusKey {
  return Object.prototype.hasOwnProperty.call(STATUS_TONE, key);
}

function normalizeStatus(status: string | null | undefined): SubscriptionStatusKey {
  if (typeof status !== 'string') return 'none';
  const key = status.trim().toLowerCase();
  return isKnownStatus(key) ? key : 'none';
}

/**
 * Ton + libellé + drapeaux d'un statut d'abonnement — remplace les tables
 * `STATUS_META` recopiées dans Dialum, Anonymum, Monitorum et Webum.
 *
 * Le `tone` est volontairement sémantique (pas une couleur) : c'est la feuille
 * de styles de l'app qui le traduit en `var(--theme-color-*)`.
 *
 * `needsAction` est vrai pour `past_due`, `canceled` et `expired` : un
 * abonnement qui a existé et s'est cassé. Il reste FAUX pour `none`/`inactive`,
 * où il n'y a rien à réparer (l'appel à l'action y est « s'abonner », pas
 * « régulariser »).
 */
export function subscriptionStatusMeta(
  status: SubscriptionStatus | string | null | undefined,
  options: SubscriptionStatusMetaOptions = {},
): SubscriptionStatusMeta {
  const raw = typeof status === 'object' && status !== null ? status.status : status;
  const key = normalizeStatus(raw);
  const copy = mergeCopy(STATUS_COPY[normalizeLocale(options.locale)], options.labels);

  return {
    tone: STATUS_TONE[key],
    label: copy[key] ?? copy.none,
    isActive: key === 'active' || key === 'trialing',
    isTrialing: key === 'trialing',
    needsAction: NEEDS_ACTION.has(key),
  };
}

export interface FormatPriceOptions {
  /** Code devise Intl (défaut 'EUR'). */
  currency?: string;
  /** Locale d'affichage (défaut 'fr-FR'). */
  locale?: string;
  /**
   * Unité du montant reçu : 'major' (défaut — 19 → « 19 € ») ou 'cents'
   * (1900 → « 19 € », le contrat `unit_amount` de Stripe).
   *
   * Le défaut est 'major' parce que c'est ce que reçoit TOUT consommateur de la
   * suite : l'API du Manager divise déjà par 100 avant de servir le front
   * (`stripe.service.js` → `amount: inv.amount_paid / 100`), BillingUpgradeCard
   * prend `prices: { monthly: 19 }`, et Webum formate les prix Gandi tels quels.
   * Un défaut 'cents' afficherait donc chaque prix 100 fois trop petit, en
   * silence — la pire panne possible sur un écran de facturation.
   * Passez `{ unit: 'cents' }` quand le montant vient directement de Stripe.
   */
  unit?: 'cents' | 'major';
}

/**
 * Prix formaté à partir d'un montant en unités entières (19 → « 19 € »).
 * Pour des centimes Stripe, passer `{ unit: 'cents' }`.
 *
 * Un montant rond s'affiche sans décimales (« 19 € », comme partout dans la
 * suite) ; un montant à centimes garde ses deux décimales (« 19,99 € ») au lieu
 * d'être arrondi à tort par le `maximumFractionDigits: 0` recopié dans les apps.
 */
export function formatPrice(value: number | null | undefined, options: FormatPriceOptions = {}): string {
  const { currency = 'EUR', locale = 'fr-FR', unit = 'major' } = options;

  if (value === null || value === undefined || !Number.isFinite(value)) return '—';

  const amount = unit === 'cents' ? value / 100 : value;
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(fractionDigits)} ${currency}`;
  }
}

export interface FormatPeriodDateOptions {
  /** Locale d'affichage (défaut 'fr-FR'). */
  locale?: string;
  /** Texte rendu si la date est absente ou illisible (défaut '—'). */
  fallback?: string;
}

/**
 * Date d'échéance / de fin d'essai en toutes lettres (« 12 mars 2026 »).
 *
 * Contrairement aux `fmtDate` recopiés dans les apps, une date ILLISIBLE rend le
 * fallback au lieu de « Invalid Date » : `new Date('n-importe-quoi')` ne lève
 * pas, leur `try/catch` ne rattrapait donc rien.
 */
export function formatPeriodDate(
  iso: string | Date | number | null | undefined,
  options: FormatPeriodDateOptions = {},
): string {
  const { locale = 'fr-FR', fallback = '—' } = options;

  const ms = toEpochMs(iso);
  if (ms === null) return fallback;

  try {
    return new Date(ms).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return fallback;
  }
}
