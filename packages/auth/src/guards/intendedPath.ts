/**
 * Mémorisation du chemin demandé avant la redirection vers la connexion.
 *
 * Écrit dans `sessionStorage` (et NON dans l'état du routeur seulement) pour
 * que les apps sans react-router — Monitorum et son routage History API — y
 * aient accès de la même façon. Les gardes passent AUSSI `state: { from }` à
 * la navigation, la convention `location.state.from` déjà lue par les pages de
 * connexion de Webum, Socialum et Noesium.
 */

export const INTENDED_PATH_STORAGE_KEY = 'umbeli.auth.intended-path';

/** Au-delà, le chemin mémorisé est considéré périmé (30 min). */
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

interface StoredIntendedPath {
  path: string;
  at: number;
}

export interface IntendedPathOptions {
  /** Clé de stockage (défaut : `INTENDED_PATH_STORAGE_KEY`). */
  key?: string;
  /** Âge maximal accepté à la lecture, en millisecondes (défaut : 30 min). */
  maxAgeMs?: number;
}

/** `sessionStorage` peut lever (Safari privé, cookies bloqués, iframe démo). */
function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Refuse toute cible qui n'est pas un chemin interne : `//evil.tld`,
 * `/\evil.tld` (les navigateurs normalisent `\` en `/`, donc
 * `location.href = '/\evil.tld'` sort du site) et `https://…`
 * sortiraient de l'app (redirection ouverte). Les caractères de contrôle
 * sont refusés aussi : ils permettent de masquer un préfixe d'URL.
 */
function isSafePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (path[0] !== '/') return false;
  if (path[1] === '/' || path[1] === '\\') return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  return true;
}

/** Chemin courant, query et hash compris (`/app/sites/42?tab=seo`). */
export function getCurrentPath(): string {
  if (typeof window === 'undefined') return '/';
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}` || '/';
}

/** Mémorise le chemin demandé. Sans effet si le stockage est indisponible. */
export function stashIntendedPath(path: string, key: string = INTENDED_PATH_STORAGE_KEY): void {
  const store = storage();
  if (!store || !isSafePath(path)) return;
  const payload: StoredIntendedPath = { path, at: Date.now() };
  try {
    store.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota plein ou stockage refusé : la redirection reste fonctionnelle */
  }
}

/** Lit le chemin mémorisé SANS l'effacer. `null` si absent, périmé ou externe. */
export function readIntendedPath(options: IntendedPathOptions = {}): string | null {
  const { key = INTENDED_PATH_STORAGE_KEY, maxAgeMs = DEFAULT_MAX_AGE_MS } = options;
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredIntendedPath> | null;
    if (!parsed || !isSafePath(parsed.path)) return null;
    // Une entrée sans horodatage valable n'expirerait jamais : on la refuse.
    if (typeof parsed.at !== 'number' || !Number.isFinite(parsed.at)) return null;
    if (Date.now() - parsed.at > maxAgeMs) return null;
    return parsed.path;
  } catch {
    return null;
  }
}

/** Efface le chemin mémorisé. */
export function clearIntendedPath(key: string = INTENDED_PATH_STORAGE_KEY): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* rien à faire */
  }
}

/** Lit ET efface : à appeler au moment de renvoyer l'utilisateur là où il allait. */
export function consumeIntendedPath(options: IntendedPathOptions = {}): string | null {
  const path = readIntendedPath(options);
  clearIntendedPath(options.key);
  return path;
}
