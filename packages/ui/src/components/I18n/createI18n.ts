/**
 * Traducteur partagé de la suite Umbeli — cœur SANS React.
 *
 * Les huit apps réimplémentaient la même chose : un dictionnaire JSON imbriqué,
 * une résolution par chemin pointé (`'nav.dashboard'`), un repli sur la clé
 * quand la traduction manque, et la langue persistée en localStorage.
 *
 * `createI18n()` fournit ce moteur hors React (intercepteur HTTP, service,
 * script, test). `<I18nProvider>` (voir `I18nProvider.tsx`) l'enveloppe pour
 * l'arbre React.
 */

/** Valeur interpolable dans une chaîne (`'Bonjour {name}'`). */
export type I18nParamValue = string | number | null | undefined;

/**
 * Paramètres d'interpolation. La clé RÉSERVÉE `defaultValue` sert de repli
 * quand la clé de traduction est absente — `t('common.remove', { defaultValue:
 * 'Retirer' })` rend `'Retirer'` au lieu de `'common.remove'`, et n'émet aucun
 * avertissement (la clé est volontairement absente).
 */
export type I18nParams = Record<string, I18nParamValue>;

/**
 * Dictionnaires par code de langue : `{ fr: frJson, en: enJson }`.
 *
 * Volontairement typé large (`unknown` en valeur) pour accepter n'importe
 * quelle forme de ressource — import JSON, objet littéral, module `.ts` typé.
 * Aucune app n'a à adapter la forme de ses locales pour adopter ce composant.
 */
export type I18nResources = Record<string, unknown>;

export interface I18nOptions {
  /** Langue utilisée quand rien n'est stocké ni détecté. @default 'fr' */
  defaultLanguage?: string;
  /**
   * Langue consultée quand la clé manque dans la langue courante.
   * @default la valeur de `defaultLanguage`
   */
  fallbackLanguage?: string;
  /**
   * Clé localStorage de persistance. Passez la clé HISTORIQUE de l'app
   * (`webum_language`, `socialum_language`, `profilum_lang`, …) sinon la
   * préférence déjà enregistrée chez l'utilisateur est ignorée.
   * @default 'umbeli_language'
   */
  storageKey?: string;
  /**
   * Au tout premier démarrage (rien en storage), déduire la langue de
   * `navigator.languages`. @default false
   */
  detectBrowserLanguage?: boolean;
  /**
   * Force l'avertissement console sur clé manquante. Par défaut : actif en
   * développement uniquement, une seule fois par couple langue + clé.
   */
  warnOnMissingKey?: boolean;
}

export interface I18nInstance {
  /** Codes de langue présents dans les ressources courantes. */
  readonly languages: string[];
  /** Clé localStorage utilisée pour la persistance. */
  readonly storageKey: string;
  /** Langue courante. */
  getLanguage(): string;
  /**
   * Compteur incrémenté à chaque changement de langue OU de ressources.
   * Sert de « snapshot » à `useSyncExternalStore` côté React.
   */
  getRevision(): number;
  /** Fixe la langue, la persiste et estampe `<html lang>`. */
  setLanguage(language: string): void;
  /** Remplace les dictionnaires (locales chargées à la demande). */
  setResources(resources: I18nResources): void;
  /** Traduit une clé pointée. Rend LA CLÉ si la traduction manque. */
  t(key: string, params?: I18nParams): string;
  /** Nœud brut (tableau, objet, nombre…) pour les contenus non textuels. */
  raw<T = unknown>(key: string, fallback?: T): T | undefined;
  /** S'abonne aux changements ; rend la fonction de désabonnement. */
  subscribe(listener: () => void): () => void;
}

const DEFAULT_LANGUAGE = 'fr';
const DEFAULT_STORAGE_KEY = 'umbeli_language';
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

// `process` n'existe pas dans un navigateur : la déclaration est locale au
// module et l'accès réel est protégé par un try/catch (voir isDevEnvironment).
declare const process: { env: { NODE_ENV?: string } };

let devModeCache: boolean | undefined;

/**
 * Vrai en développement. `process.env.NODE_ENV` est remplacé STATIQUEMENT par
 * Vite/webpack au build ; sans bundler l'identifiant n'existe pas et l'accès
 * lève une `ReferenceError` — on retombe alors sur « pas de dev », donc
 * silence total en production.
 *
 * @internal
 */
export function isDevEnvironment(): boolean {
  if (devModeCache !== undefined) return devModeCache;
  let dev: boolean;
  try {
    dev = process.env.NODE_ENV !== 'production';
  } catch {
    dev = false;
  }
  devModeCache = dev;
  return dev;
}

/**
 * Résout un chemin pointé dans un arbre de traductions.
 * `hasOwnProperty` plutôt que `in` : `t('constructor')` ne doit jamais
 * remonter un membre du prototype.
 */
function lookup(tree: unknown, key: string): unknown {
  if (tree === null || typeof tree !== 'object' || key === '') return undefined;
  let current: unknown = tree;
  for (const segment of key.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Remplace `{name}` par `params.name`. Un paramètre absent reste littéral. */
function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

function readStoredLanguage(storageKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    // Fenêtre privée / stockage bloqué : on ignore silencieusement.
    return null;
  }
}

function writeStoredLanguage(storageKey: string, language: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, language);
  } catch {
    // Fenêtre privée / stockage bloqué : la langue reste en mémoire seulement.
  }
}

/** Estampe `<html lang="fr">` — accessibilité, `:lang()` CSS et SEO. */
function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}

/** Première langue du navigateur disponible dans les ressources. */
function detectNavigatorLanguage(available: string[]): string | null {
  if (typeof navigator === 'undefined' || available.length === 0) return null;
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const lower = candidate.toLowerCase();
    const exact = available.find((code) => code.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    const partial = available.find((code) => code.toLowerCase().split('-')[0] === base);
    if (partial) return partial;
  }
  return null;
}

/**
 * Crée un traducteur autonome.
 *
 * ```ts
 * import fr from './locales/fr.json';
 * import en from './locales/en.json';
 *
 * export const i18n = createI18n({ fr, en }, { storageKey: 'webum_language' });
 *
 * i18n.t('billing.trialUntil', { date: '30 juin' });
 * i18n.setLanguage('en');
 * ```
 *
 * La même instance peut être passée à `<I18nProvider i18n={i18n}>` : React et
 * le code hors React partagent alors UNE seule langue courante.
 */
export function createI18n(resources: I18nResources, options: I18nOptions = {}): I18nInstance {
  const {
    defaultLanguage = DEFAULT_LANGUAGE,
    fallbackLanguage = defaultLanguage,
    storageKey = DEFAULT_STORAGE_KEY,
    detectBrowserLanguage = false,
    warnOnMissingKey,
  } = options;

  let tree: I18nResources = resources ?? {};
  let revision = 0;
  const listeners = new Set<() => void>();
  const warnedKeys = new Set<string>();

  const isKnownLanguage = (code: string): boolean =>
    Object.prototype.hasOwnProperty.call(tree, code);

  let language = ((): string => {
    const stored = readStoredLanguage(storageKey);
    // Ressources vides au démarrage (locales chargées plus tard) : on fait
    // confiance à la préférence stockée plutôt que de l'écraser.
    if (stored && (isKnownLanguage(stored) || Object.keys(tree).length === 0)) return stored;
    if (detectBrowserLanguage) {
      const detected = detectNavigatorLanguage(Object.keys(tree));
      if (detected) return detected;
    }
    return defaultLanguage;
  })();

  const notify = (): void => {
    revision += 1;
    // Copie : un écouteur peut se désabonner pendant la diffusion.
    for (const listener of [...listeners]) listener();
  };

  const shouldWarn = (): boolean =>
    warnOnMissingKey === undefined ? isDevEnvironment() : warnOnMissingKey;

  const warnMissing = (key: string, wrongType: boolean): void => {
    if (!shouldWarn()) return;
    const id = `${language}:${key}`;
    if (warnedKeys.has(id)) return;
    warnedKeys.add(id);
    const reason = wrongType
      ? "ne pointe pas sur une chaîne (nœud intermédiaire ?) — utilisez raw() pour un tableau ou un objet"
      : 'est absente du dictionnaire';
    // eslint-disable-next-line no-console
    console.warn(`[@umbeli-com/ui] i18n : la clé « ${key} » (langue « ${language} ») ${reason}.`);
  };

  const resolve = (key: string): unknown => {
    const primary = lookup(tree[language], key);
    if (primary !== undefined) return primary;
    if (fallbackLanguage !== language) return lookup(tree[fallbackLanguage], key);
    return undefined;
  };

  const t = (key: string, params?: I18nParams): string => {
    if (typeof key !== 'string' || key.length === 0) return '';
    const value = resolve(key);
    if (typeof value === 'string') return interpolate(value, params);
    // Un nombre dans le JSON reste une traduction utilisable.
    if (typeof value === 'number') return interpolate(String(value), params);
    const defaultValue = params?.defaultValue;
    if (typeof defaultValue === 'string') return interpolate(defaultValue, params);
    warnMissing(key, value !== undefined);
    return key;
  };

  const raw = <T = unknown,>(key: string, fallback?: T): T | undefined => {
    const value = resolve(key);
    return value === undefined ? fallback : (value as T);
  };

  const setLanguage = (next: string): void => {
    if (typeof next !== 'string' || next.length === 0 || next === language) return;
    language = next;
    writeStoredLanguage(storageKey, next);
    applyDocumentLanguage(next);
    notify();
  };

  const setResources = (next: I18nResources): void => {
    tree = next ?? {};
    warnedKeys.clear();
    notify();
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    get languages() {
      return Object.keys(tree);
    },
    storageKey,
    getLanguage: () => language,
    getRevision: () => revision,
    setLanguage,
    setResources,
    t,
    raw,
    subscribe,
  };
}
