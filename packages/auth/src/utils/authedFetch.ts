/**
 * Authenticated fetch wrapper shared by every Umbeli SaaS front-end.
 *
 * Replaces the nine hand-rolled `fetchWithAuth` / `fetchWithRetry` / `apiFetch`
 * copies (Noesium, UmbeliumManager, Dialum, Monitorum, Scrapium, ...).
 *
 * Guarantees:
 *  - The bearer token is read from the CURRENT Supabase session on every call,
 *    never captured at creation time.
 *  - A 401 triggers exactly ONE `refreshSession()` and ONE retry. Concurrent
 *    401s share the single in-flight refresh instead of stampeding it.
 *  - If the retry still fails, `onSessionExpired` runs once (default: global
 *    sign-out then redirect to `loginPath`). It only re-arms after an
 *    authenticated request succeeds again, so there is no loop, ever.
 *  - Network failures are rethrown as `AuthedFetchError` with the original
 *    error kept in `.cause` — nothing is swallowed. The ONE exception is an
 *    abort: `AbortController.abort()` rethrows the original `AbortError`
 *    untouched, so the usual `err.name === 'AbortError'` guard keeps working
 *    and a cancelled request never surfaces as a "server unreachable" toast.
 *  - A non-JSON response body never throws while parsing; it comes back as text.
 *
 * Usage:
 *   const api = createAuthedFetch({
 *     client: supabase,
 *     baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
 *     logPrefix: '[Dialum]',
 *   });
 *
 *   const projects = await api.get<Project[]>('/projects');
 *   await api.post('/projects', { name: 'Nouveau' });
 *   const raw = await api.fetch('/export.csv');
 */

/* ------------------------------------------------------------------ *
 * Supabase client shape
 *
 * Structural on purpose: a real `SupabaseClient` from any @supabase/supabase-js
 * v2 satisfies it, and the package stays usable with a stub in tests without
 * pinning a supabase-js version through the type system.
 * ------------------------------------------------------------------ */

export interface AuthedFetchSession {
  access_token?: string | null;
}

export interface AuthedFetchSessionResult {
  data: { session: AuthedFetchSession | null } | null;
  error?: unknown;
}

export interface AuthedFetchAuthApi {
  getSession(): Promise<AuthedFetchSessionResult>;
  refreshSession(currentSession?: { refresh_token: string }): Promise<AuthedFetchSessionResult>;
  signOut?(options?: { scope?: 'global' | 'local' | 'others' }): Promise<unknown>;
}

export interface AuthedFetchSupabaseClient {
  auth: AuthedFetchAuthApi;
}

/* ------------------------------------------------------------------ *
 * Labels (FR by default, fully overridable — suite convention)
 * ------------------------------------------------------------------ */

export interface AuthedFetchLabels {
  /** Thrown / logged when the session cannot be recovered. */
  sessionExpired: string;
  /** Thrown when `fetch` itself rejects (offline, DNS, CORS, aborted). */
  networkError: string;
  /** Fallback for a non-2xx response with no usable server message. `{status}` is substituted. */
  requestFailed: string;
}

export const DEFAULT_AUTHED_FETCH_LABELS: AuthedFetchLabels = {
  sessionExpired: 'Session expirée, veuillez vous reconnecter.',
  networkError: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  requestFailed: 'La requête a échoué ({status}).',
};

/* ------------------------------------------------------------------ *
 * Error
 * ------------------------------------------------------------------ */

export interface AuthedFetchErrorDetails {
  /** Fully resolved URL that was called. */
  url: string;
  /** HTTP method used. */
  method: string;
  /** HTTP status, absent when the request never reached the server. */
  status?: number;
  /** Parsed response body (object, string, or null) when there was one. */
  body?: unknown;
  /** Original error when the failure came from `fetch` itself. */
  cause?: unknown;
}

/**
 * Every rejection produced by an authed fetch client is one of these — except a
 * caller-triggered abort, which is rethrown as the original `AbortError`.
 */
export class AuthedFetchError extends Error {
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly body?: unknown;
  readonly cause?: unknown;

  constructor(message: string, details: AuthedFetchErrorDetails) {
    super(message);
    this.name = 'AuthedFetchError';
    this.url = details.url;
    this.method = details.method;
    this.status = details.status;
    this.body = details.body;
    this.cause = details.cause;
  }
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export interface CreateAuthedFetchOptions {
  /** Supabase client whose session provides the bearer token. */
  client: AuthedFetchSupabaseClient;
  /** API root, e.g. `https://api.dialum.ca` or `/api`. Empty string = same origin. */
  baseUrl?: string;
  /** Where the default `onSessionExpired` sends the user. Defaults to `/auth`. */
  loginPath?: string;
  /**
   * Runs once when a 401 survives the refresh + retry. Overrides the default
   * (global sign-out then `window.location.href = loginPath`).
   */
  onSessionExpired?: () => void | Promise<void>;
  /** Prefix for console warnings, e.g. `[Dialum]`. Defaults to `[auth]`. */
  logPrefix?: string;
  /**
   * Path segment to drop once `baseUrl` already carries it — Noesium's rule.
   *
   * With `stripPathPrefix: '/api'`, `apiUrl('/api/foo')` gives:
   *  - `https://api.noesium.ca/foo` when `baseUrl` is set (the base IS the API root);
   *  - `/api/foo` when `baseUrl` is `''` (same origin: the prefix is the only
   *    thing routing the call to the API).
   *
   * That conditional is deliberate — it is what lets `/api/...` call sites stay
   * untouched across both deployment shapes. Leave it unset for new code and
   * write paths without the prefix.
   */
  stripPathPrefix?: string;
  /** Override any user-visible string. FR defaults. */
  labels?: Partial<AuthedFetchLabels>;
}

export interface AuthedFetch {
  /** Raw response, auth + refresh handled. Use for downloads and streams. */
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  get: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  /** DELETE (`delete` is a reserved word). */
  del: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  /** Resolve a path against `baseUrl` without doubling or dropping a slash. */
  apiUrl: (path: string) => string;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Join `baseUrl` and `path` with exactly one slash between them.
 *
 * `stripPathPrefix` (optional) removes that leading segment from `path`, but
 * ONLY when `baseUrl` is non-empty — see `CreateAuthedFetchOptions`.
 */
export function joinApiUrl(baseUrl: string, path: string, stripPathPrefix?: string): string {
  if (ABSOLUTE_URL.test(path) || path.startsWith('//')) return path;

  const base = baseUrl.replace(/\/+$/, '');
  if (!path) return base || '/';

  let suffix = path.startsWith('/') ? path : `/${path}`;

  if (base && stripPathPrefix) {
    const prefix = stripPathPrefix.startsWith('/') ? stripPathPrefix : `/${stripPathPrefix}`;
    const trimmed = prefix.replace(/\/+$/, '');
    // Segment-exact: '/api' strips '/api/x' and '/api', never '/apixyz'.
    if (trimmed && (suffix === trimmed || suffix.startsWith(`${trimmed}/`))) {
      suffix = suffix.slice(trimmed.length);
    }
  }

  return `${base}${suffix}`;
}

/** True for bodies that must be sent as-is (no JSON.stringify, no JSON header). */
function isRawBody(body: unknown): body is BodyInit {
  if (typeof body === 'string') return true;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return true;
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return true;
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body)) return true;
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return true;
  return false;
}

/** Only a string body is assumed to be JSON; FormData & friends keep their own type. */
function hasJsonBody(body: BodyInit | null | undefined): boolean {
  return typeof body === 'string' && body.length > 0;
}

/**
 * True when the failure is a caller-triggered cancellation rather than a real
 * network problem. `signal.aborted` is checked too because a few environments
 * (jsdom, older Safari) reject with a plain `Error` instead of an `AbortError`.
 */
function isAbortError(error: unknown, signal?: AbortSignal | null): boolean {
  if (signal?.aborted) return true;
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

function pickServerMessage(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidate = record.error ?? record.message;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  // Short plain-text bodies are usable; HTML error pages are not.
  if (typeof payload === 'string') {
    const text = payload.trim();
    if (text && text.length <= 300 && !text.startsWith('<')) return text;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Factory
 * ------------------------------------------------------------------ */

export function createAuthedFetch(options: CreateAuthedFetchOptions): AuthedFetch {
  const {
    client,
    baseUrl = '',
    loginPath = '/auth',
    onSessionExpired,
    logPrefix = '[auth]',
    labels: labelOverrides,
    stripPathPrefix,
  } = options;

  const labels: AuthedFetchLabels = { ...DEFAULT_AUTHED_FETCH_LABELS, ...labelOverrides };
  const prefix = logPrefix.trim();

  /** Single in-flight refresh shared by every concurrent 401. */
  let refreshInFlight: Promise<string | null> | null = null;
  /** Guards against N concurrent failures firing N redirects. */
  let sessionExpiredHandled = false;

  function warn(message: string, detail?: unknown): void {
    if (detail === undefined) console.warn(`${prefix} ${message}`);
    else console.warn(`${prefix} ${message}`, detail);
  }

  function apiUrl(path: string): string {
    return joinApiUrl(baseUrl, path, stripPathPrefix);
  }

  /** Token from the CURRENT session — re-read on every attempt, never captured. */
  async function currentAccessToken(): Promise<string | null> {
    try {
      const result = await client.auth.getSession();
      return result?.data?.session?.access_token ?? null;
    } catch (error) {
      warn('Lecture de la session impossible, requête envoyée sans jeton.', error);
      return null;
    }
  }

  async function performRefresh(): Promise<string | null> {
    try {
      const result = await client.auth.refreshSession();
      const token = result?.data?.session?.access_token ?? null;
      if (!token) {
        warn('Rafraîchissement de la session sans jeton.', result?.error);
        return null;
      }
      // A successful refresh re-arms the expiry handler for a future outage.
      sessionExpiredHandled = false;
      return token;
    } catch (error) {
      warn('Rafraîchissement de la session en échec.', error);
      return null;
    }
  }

  /**
   * Deduplicated refresh. Ten requests that 401 at the same moment await the
   * same promise, so Supabase sees one refresh call and one rotated refresh
   * token — a stampede would otherwise invalidate the others' tokens.
   */
  function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    const pending = performRefresh();
    refreshInFlight = pending;
    // `performRefresh` never rejects, so this derived promise never rejects either.
    void pending.finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null;
    });
    return pending;
  }

  async function handleSessionExpired(): Promise<void> {
    if (sessionExpiredHandled) return;
    sessionExpiredHandled = true;

    if (onSessionExpired) {
      try {
        await onSessionExpired();
      } catch (error) {
        warn('onSessionExpired a levé une erreur.', error);
      }
      return;
    }

    warn(`Session expirée et non récupérable, redirection vers ${loginPath}`);
    try {
      await client.auth.signOut?.({ scope: 'global' });
    } catch (error) {
      warn('signOut en échec, redirection quand même.', error);
    }
    if (typeof window !== 'undefined') {
      window.location.href = loginPath;
    }
  }

  function buildHeaders(init: RequestInit, token: string | null): Headers {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (hasJsonBody(init.body) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  async function runFetch(url: string, init: RequestInit, token: string | null): Promise<Response> {
    try {
      return await fetch(url, { ...init, headers: buildHeaders(init, token) });
    } catch (error) {
      // A cancellation is not a network failure: rethrow it verbatim so the
      // caller's `err.name === 'AbortError'` guard still fires.
      if (isAbortError(error, init.signal)) throw error;
      // Never swallowed: the original DOMException / TypeError rides along.
      throw new AuthedFetchError(labels.networkError, {
        url,
        method: init.method ?? 'GET',
        cause: error,
      });
    }
  }

  /** Auth + one refresh + one retry. Two fetches maximum, no loop. */
  async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = apiUrl(path);

    const token = await currentAccessToken();
    const response = await runFetch(url, init, token);
    if (response.status !== 401) {
      // Credentials are being accepted again — typically after the user signed
      // back in without a full reload. Re-arm the handler, otherwise a second
      // expiry in the same page session would be swallowed by the guard and
      // leave the user stuck on failing requests with no way back to login.
      if (token) sessionExpiredHandled = false;
      return response;
    }

    const freshToken = await refreshAccessToken();
    if (freshToken) {
      const retried = await runFetch(url, init, freshToken);
      if (retried.status !== 401) return retried;
      await handleSessionExpired();
      return retried;
    }

    await handleSessionExpired();
    return response;
  }

  /** Reads the body once. Non-JSON comes back as text; it must never throw here. */
  async function readBody(
    response: Response,
    url: string,
    method: string,
    signal?: AbortSignal | null,
  ): Promise<unknown> {
    if (response.status === 204 || response.status === 205) return null;

    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      // Aborted mid-body: same rule as `runFetch`, the cancellation wins.
      if (isAbortError(error, signal)) throw error;
      throw new AuthedFetchError(labels.networkError, {
        url,
        method,
        status: response.status,
        cause: error,
      });
    }

    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    init: RequestInit = {},
  ): Promise<T> {
    const requestInit: RequestInit = { ...init, method };
    if (body !== undefined) {
      requestInit.body = isRawBody(body) ? body : JSON.stringify(body);
    }

    const url = apiUrl(path);
    const response = await authedFetch(path, requestInit);
    const payload = await readBody(response, url, method, requestInit.signal);

    if (!response.ok) {
      const message =
        pickServerMessage(payload) ??
        (response.status === 401
          ? labels.sessionExpired
          : labels.requestFailed.replace('{status}', String(response.status)));

      throw new AuthedFetchError(message, {
        url,
        method,
        status: response.status,
        body: payload,
      });
    }

    return payload as T;
  }

  return {
    fetch: authedFetch,
    apiUrl,
    get: <T = unknown>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
    post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>('POST', path, body, init),
    put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>('PUT', path, body, init),
    patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>('PATCH', path, body, init),
    del: <T = unknown>(path: string, init?: RequestInit) =>
      request<T>('DELETE', path, undefined, init),
  };
}
