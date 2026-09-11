import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
// Aucun style propre : ce composant ne rend que ses enfants.

/**
 * Thème effectif de la suite. DEUX états seulement — décision suite 2026-08-12 :
 * l'option « système » a été retirée de l'UI.
 */
export type Theme = 'light' | 'dark';

/** Valeur possiblement présente en localStorage, y compris l'héritage `'system'`. */
export type StoredTheme = Theme | 'system';

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Clé localStorage utilisée pour persister le thème.
   * Passez la clé HISTORIQUE de l'app (`webum_theme`, `dialum_theme`, …) sinon
   * la préférence déjà enregistrée chez l'utilisateur est ignorée.
   * @default 'umbeli_theme'
   */
  storageKey?: string;
  /** Thème appliqué quand rien n'est stocké (apps dark-first : `'dark'`). @default 'light' */
  defaultTheme?: Theme;
}

export interface ThemeContextValue {
  /** Thème courant, toujours `'light'` ou `'dark'`. */
  theme: Theme;
  /** Fixe le thème et le persiste. */
  setTheme: (theme: Theme) => void;
  /** Bascule light ↔ dark. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** `useLayoutEffect` côté navigateur, `useEffect` côté serveur (évite l'avertissement SSR). */
const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** Thème préféré de l'OS — sert uniquement à migrer un ancien état `'system'`. */
function resolveSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(storageKey: string): StoredTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : null;
  } catch {
    // Fenêtre privée / stockage bloqué : on ignore silencieusement.
    return null;
  }
}

function writeStoredTheme(storageKey: string, theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Fenêtre privée / stockage bloqué : le thème reste en mémoire seulement.
  }
}

/**
 * Applique les TROIS accroches sur lesquelles le CSS partagé de la suite s'appuie :
 * `class="light|dark"`, `data-theme` et `color-scheme`.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/**
 * Provider de thème unique de la suite Umbeli.
 *
 * ```tsx
 * <ThemeProvider storageKey="webum_theme" defaultTheme="light">
 *   <App />
 * </ThemeProvider>
 * ```
 *
 * Une valeur `'system'` héritée en storage est MIGRÉE vers le thème résolu de
 * l'OS et réécrite sous la même clé : elle ne persiste pas et ne casse rien.
 */
export function ThemeProvider({
  children,
  storageKey = 'umbeli_theme',
  defaultTheme = 'light',
}: ThemeProviderProps): ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readStoredTheme(storageKey);
    // Initialiseur PUR : aucune écriture ici (un rendu concurrent abandonné ou
    // le double-appel de StrictMode ne doit pas toucher au stockage).
    if (stored === 'system') return resolveSystemTheme();
    return stored ?? defaultTheme;
  });

  // Migration (décision 2026-08-12) de l'héritage `'system'` : on réécrit la
  // valeur résolue sous la même clé. Resynchronise aussi l'état si `storageKey`
  // change en cours de vie ; une clé sans valeur stockée laisse le thème courant.
  useEffect(() => {
    const stored = readStoredTheme(storageKey);
    if (stored === null) return;
    const resolved: Theme = stored === 'system' ? resolveSystemTheme() : stored;
    if (stored === 'system') writeStoredTheme(storageKey, resolved);
    setThemeState((prev) => (prev === resolved ? prev : resolved));
  }, [storageKey]);

  // Avant peinture côté client : évite le flash de thème au montage.
  useIsomorphicLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Un autre onglet de la même app change le thème → on suit.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      // `storage` est aussi émis pour sessionStorage : on ne suit que le nôtre.
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      const next = event.newValue;
      if (next === 'light' || next === 'dark') setThemeState(next);
      else if (next === 'system') setThemeState(resolveSystemTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const setTheme = useCallback(
    (next: Theme) => {
      writeStoredTheme(storageKey, next);
      setThemeState(next);
    },
    [storageKey],
  );

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      writeStoredTheme(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Accès au thème courant. À utiliser sous un `<ThemeProvider>` — sinon une
 * erreur nommée `ThemeProviderMissingError` est levée.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    const error = new Error(
      "useTheme() a été appelé en dehors d'un <ThemeProvider>. " +
        'Enveloppez votre application avec <ThemeProvider storageKey="…"> ' +
        "(depuis '@umbeli-com/ui') avant d'utiliser ce hook.",
    );
    error.name = 'ThemeProviderMissingError';
    throw error;
  }
  return context;
}
