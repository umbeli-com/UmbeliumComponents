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

export function getAuthCallbackUrl(): string {
  try {
    const configured = (import.meta as any).env?.VITE_AUTH_CALLBACK_URL as string | undefined;
    if (configured?.trim()) return trimTrailingSlashes(configured.trim());
  } catch { /* env not available */ }
  return buildRedirectUrl(CALLBACK_PATH);
}

export function getResetPasswordUrl(): string {
  try {
    const configured = (import.meta as any).env?.VITE_AUTH_RESET_PASSWORD_URL as string | undefined;
    if (configured?.trim()) return trimTrailingSlashes(configured.trim());
  } catch { /* env not available */ }
  return buildRedirectUrl(RESET_PASSWORD_PATH);
}
