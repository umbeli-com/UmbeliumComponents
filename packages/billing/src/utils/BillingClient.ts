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
 */

export interface SubscriptionStatus {
  plan: string;
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  periodEnd: string | null;
  trialEnd?: string | null;
  accessBlocked?: boolean;
  hasUsedTrial?: boolean;
  selectedApps?: string[];
}

export interface BillingClientConfig {
  /** UmbeliumManager API base URL (e.g. https://manager.umbeli.com/api) */
  apiBaseUrl: string;
  /** This app's key (e.g. 'dialum', 'socialum', 'noesium') */
  appKey: string;
  /** Returns a valid Supabase access token, or null if session expired */
  getAccessToken: () => Promise<string | null>;
  /** Called when session is unrecoverable (e.g. redirect to /auth) */
  onSessionExpired?: () => void;
}

export interface BillingClient {
  getSubscriptionStatus: () => Promise<SubscriptionStatus>;
  startTrial: () => Promise<void>;
  createCheckoutSession: (billingInterval: 'monthly' | 'annual') => Promise<{ url: string }>;
  openBillingPortal: () => Promise<{ url: string }>;
  /** Returns true if status is 'active' or 'trialing' and not blocked */
  isAccessGranted: (status: SubscriptionStatus) => boolean;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || body?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function createBillingClient(config: BillingClientConfig): BillingClient {
  const { apiBaseUrl, appKey, getAccessToken, onSessionExpired } = config;

  async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Session invalide, reconnectez-vous.');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, { ...init, headers });

    if (response.status === 401) {
      onSessionExpired?.();
      throw new Error('Session expiree, reconnectez-vous.');
    }

    return response;
  }

  return {
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
      if (!apiBaseUrl) {
        return { plan: 'free', status: 'none', periodEnd: null };
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
      };
    },

    async startTrial(): Promise<void> {
      if (!apiBaseUrl) {
        throw new Error('Billing API non configuree.');
      }

      const response = await authFetch(`${apiBaseUrl}/stripe/auto-provision`, {
        method: 'POST',
        body: JSON.stringify({ sourceApps: [appKey] }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }
    },

    async createCheckoutSession(billingInterval: 'monthly' | 'annual'): Promise<{ url: string }> {
      if (!apiBaseUrl) {
        throw new Error('Billing API non configuree.');
      }

      const response = await authFetch(`${apiBaseUrl}/stripe/workspace-checkout`, {
        method: 'POST',
        body: JSON.stringify({
          selectedApps: [appKey],
          billingInterval,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('URL de paiement manquante dans la reponse.');
      }
      return { url: payload.url };
    },

    async openBillingPortal(): Promise<{ url: string }> {
      if (!apiBaseUrl) {
        throw new Error('Billing API non configuree.');
      }

      const response = await authFetch(`${apiBaseUrl}/stripe/portal`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('URL du portail manquante dans la reponse.');
      }
      return { url: payload.url };
    },

    isAccessGranted(status: SubscriptionStatus): boolean {
      if (status.accessBlocked) return false;
      return status.status === 'active' || status.status === 'trialing';
    },
  };
}
