const CALLBACK_PATH = '/auth/callback';
const RESET_PASSWORD_PATH = '/auth/reset-password';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function getWindowOrigin(): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return '';
  }

  return trimTrailingSlashes(window.location.origin);
}

function buildRedirectUrl(path: string): string {
  const origin = getWindowOrigin();
  return origin ? `${origin}${path}` : path;
}

/** `import.meta.env` de Vite, sans dépendre des types de Vite : le paquet
 *  est aussi lu hors Vite (tests, SSR), où `env` est absent. */
type ViteImportMeta = ImportMeta & { env?: Record<string, string | undefined> };

export function getAuthCallbackUrl(): string {
  try {
    const configured = (import.meta as ViteImportMeta).env?.VITE_AUTH_CALLBACK_URL;
    if (configured?.trim()) return trimTrailingSlashes(configured.trim());
  } catch { /* env not available */ }
  return buildRedirectUrl(CALLBACK_PATH);
}

export function getResetPasswordUrl(): string {
  try {
    const configured = (import.meta as ViteImportMeta).env?.VITE_AUTH_RESET_PASSWORD_URL;
    if (configured?.trim()) return trimTrailingSlashes(configured.trim());
  } catch { /* env not available */ }
  return buildRedirectUrl(RESET_PASSWORD_PATH);
}
