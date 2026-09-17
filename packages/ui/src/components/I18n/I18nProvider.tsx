import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  createI18n,
  type I18nInstance,
  type I18nParams,
  type I18nResources,
} from './createI18n';
// Aucun style propre : ce composant ne rend que ses enfants.

export interface I18nContextValue {
  /** Traduit une clé pointée ; rend LA CLÉ si la traduction manque. */
  t: (key: string, params?: I18nParams) => string;
  /** Nœud brut (tableau, objet…) pour les contenus non textuels. */
  raw: <T = unknown>(key: string, fallback?: T) => T | undefined;
  /** Langue courante. */
  language: string;
  /** Change la langue, la persiste et estampe `<html lang>`. */
  setLanguage: (language: string) => void;
  /** Codes de langue disponibles dans les ressources. */
  languages: string[];
}

export interface I18nProviderProps {
  children: ReactNode;
  /**
   * Dictionnaires par langue : `{ fr, en }`. Un objet littéral en ligne est
   * attendu et supporté : la comparaison porte sur les LANGUES et sur
   * l'identité de CHAQUE dictionnaire, pas sur celle de l'objet enveloppe —
   * donc aucune repropagation à chaque rendu. Gardez les dictionnaires
   * eux-mêmes stables (import JSON, module, `useMemo`) : un dictionnaire
   * reconstruit à chaque rendu est repoussé dans l'instance à chaque rendu.
   */
  resources?: I18nResources;
  /**
   * Instance déjà construite via `createI18n()`. Utile quand du code HORS
   * React (client HTTP, service) doit partager la même langue courante.
   * Quand elle est fournie, `resources` et les options ci-dessous sont
   * ignorées : l'instance porte déjà sa configuration.
   */
  i18n?: I18nInstance;
  /** Langue utilisée quand rien n'est stocké. @default 'fr' */
  defaultLanguage?: string;
  /** Langue consultée quand la clé manque. @default `defaultLanguage` */
  fallbackLanguage?: string;
  /**
   * Clé localStorage. Passez la clé HISTORIQUE de l'app (`webum_language`,
   * `socialum_language`, …) pour ne pas perdre la préférence des utilisateurs.
   * @default 'umbeli_language'
   */
  storageKey?: string;
  /** Déduire la langue de `navigator.languages` au 1er démarrage. @default false */
  detectBrowserLanguage?: boolean;
  /** Force l'avertissement « clé manquante » (par défaut : dev seulement). */
  warnOnMissingKey?: boolean;
  /** Appelé APRÈS chaque changement de langue (pas au montage). */
  onLanguageChange?: (language: string) => void;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/** `useLayoutEffect` côté navigateur, `useEffect` côté serveur (évite l'avertissement SSR). */
const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Égalité de surface : mêmes codes de langue, et même dictionnaire (comparé par
 * IDENTITÉ) pour chacun. Un littéral `{ fr, en }` reconstruit à chaque rendu
 * autour de dictionnaires stables (imports JSON, modules) est donc reconnu
 * comme inchangé ; en revanche des dictionnaires eux-mêmes reconstruits à
 * chaque rendu provoquent une repropagation à chaque rendu du parent.
 */
function sameResources(a: I18nResources | undefined, b: I18nResources | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.is(a[key], b[key]));
}

/**
 * Provider i18n unique de la suite Umbeli.
 *
 * ```tsx
 * import fr from './locales/fr.json';
 * import en from './locales/en.json';
 *
 * <I18nProvider resources={{ fr, en }} storageKey="webum_language" defaultLanguage="fr">
 *   <App />
 * </I18nProvider>
 * ```
 *
 * Une clé absente rend la clé elle-même — jamais d'écran blanc pour une
 * traduction oubliée — avec un avertissement console une seule fois par clé,
 * en développement uniquement.
 */
export function I18nProvider({
  children,
  resources,
  i18n: externalI18n,
  defaultLanguage = 'fr',
  fallbackLanguage,
  storageKey = 'umbeli_language',
  detectBrowserLanguage = false,
  warnOnMissingKey,
  onLanguageChange,
}: I18nProviderProps): ReactElement {
  // Instance interne créée UNE fois. Elle est ignorée si `i18n` est fourni,
  // mais reste construite pour que retirer la prop ne casse rien.
  const [internalI18n] = useState<I18nInstance>(() =>
    createI18n(resources ?? {}, {
      defaultLanguage,
      fallbackLanguage,
      storageKey,
      detectBrowserLanguage,
      warnOnMissingKey,
    }),
  );
  const i18n = externalI18n ?? internalI18n;

  // Les ressources ont changé (locales chargées à la demande) → on les pousse
  // dans l'instance. `resources={{ fr, en }}` crée un objet neuf à chaque
  // rendu : la comparaison porte donc sur les langues et sur l'identité de
  // chaque dictionnaire, pas sur celle de l'objet enveloppe.
  const lastResources = useRef<I18nResources | undefined>(resources);
  useIsomorphicLayoutEffect(() => {
    if (externalI18n || !resources) return;
    if (sameResources(lastResources.current, resources)) return;
    lastResources.current = resources;
    i18n.setResources(resources);
  }, [externalI18n, i18n, resources]);

  // Source de vérité = l'instance, y compris quand elle est pilotée hors React.
  // Les méthodes sont APPELÉES sur l'instance (jamais détachées) : une
  // implémentation de `I18nInstance` écrite en classe ou en méthodes abrégées
  // garde son `this`.
  const subscribe = useCallback((listener: () => void) => i18n.subscribe(listener), [i18n]);
  const getRevision = useCallback(() => i18n.getRevision(), [i18n]);
  const revision = useSyncExternalStore(subscribe, getRevision, getRevision);

  const value = useMemo<I18nContextValue>(
    // `revision` en dépendance : recalcule à chaque changement de langue ou de
    // ressources, sans quoi les consommateurs garderaient l'ancien rendu.
    () => ({
      t: (key, params) => i18n.t(key, params),
      raw: <T,>(key: string, fallback?: T) => i18n.raw<T>(key, fallback),
      language: i18n.getLanguage(),
      setLanguage: (next) => i18n.setLanguage(next),
      languages: i18n.languages,
    }),
    // `i18n` est mutable : `revision` (store externe) est ce qui signale le
    // changement, d'où une dépendance non lue dans le corps — voulue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n, revision],
  );

  const language = value.language;

  // Avant peinture côté client : `<html lang>` correct dès le premier rendu.
  useIsomorphicLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }, [language]);

  // Un autre onglet de la même app change la langue → on suit.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = i18n.storageKey;
    if (!key) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      // `storage` est aussi émis pour sessionStorage : on ne suit que le nôtre.
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      const next = event.newValue;
      if (!next) return;
      // Une valeur inconnue (autre app sur le même domaine, valeur corrompue)
      // ne doit pas basculer l'UI. Tant que les ressources sont vides
      // (locales chargées à la demande), on fait confiance à la valeur.
      const known = i18n.languages;
      if (known.length > 0 && !known.includes(next)) return;
      i18n.setLanguage(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [i18n]);

  // Notification applicative (persistance profil, analytics…) : jamais au montage.
  const changeHandler = useRef(onLanguageChange);
  useEffect(() => {
    changeHandler.current = onLanguageChange;
  }, [onLanguageChange]);
  // On compare à la DERNIÈRE langue notifiée plutôt qu'à un drapeau « déjà
  // monté » : le double montage de StrictMode rejouerait l'effet avec le
  // drapeau déjà vrai et déclencherait un faux changement au montage.
  const notifiedLanguage = useRef(language);
  useEffect(() => {
    if (notifiedLanguage.current === language) return;
    notifiedLanguage.current = language;
    changeHandler.current?.(language);
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
