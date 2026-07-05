// @ts-check
import { test as base, expect } from '@playwright/test';

/**
 * Fixture de mocks réseau partagé pour les apps Umbeli.
 *
 * Intercepte Supabase Auth + le backend billing (Stripe) au niveau réseau, afin
 * de tester le VRAI comportement frontend (clics, redirections, gates) sans
 * aucun secret ni backend. Auth & billing étant mutualisés (@umbeli-com/auth,
 * @umbeli-com/billing), cette logique est écrite une fois et réutilisée partout.
 *
 * Les spécificités par app (clé localStorage invité, sélecteurs du formulaire de
 * login, endpoints billing) sont injectées via `options`.
 *
 * @typedef {'active'|'inactive'|'trialing'|'canceled'} SubStatus
 * @typedef {{ plan: string, status: SubStatus, periodEnd: string|null }} Subscription
 *
 * @typedef {object} UmbeliE2EOptions
 * @property {string} [guestStorageKey] Clé localStorage du mode invité (ex: 'anonymium_guest_session').
 * @property {object} [login] Config du parcours loginViaUI.
 * @property {string} [login.emailSelector]
 * @property {string} [login.passwordSelector]
 * @property {RegExp} [login.submitName] Nom accessible du bouton submit.
 * @property {string} [login.email]
 * @property {string} [login.password]
 * @property {string} [login.authPath] Ex: '/auth'.
 * @property {string} [login.appPath] Ex: '/app'.
 * @property {object} [user] Faux user renvoyé par Supabase.
 * @property {string} [checkoutRedirect] URL de redirection simulée du checkout.
 * @property {string} [portalRedirect] URL de redirection simulée du portail.
 */

const DEFAULTS = {
  guestStorageKey: null,
  login: {
    emailSelector: '#email',
    passwordSelector: '#password',
    submitName: /se connecter|sign in|log in/i,
    email: 'e2e@umbeli.test',
    password: 'sup3rs3cret!',
    authPath: '/auth',
    appPath: '/app',
  },
  user: {
    id: 'e2e-user-0001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'e2e@umbeli.test',
    user_metadata: { full_name: 'E2E User', name: 'E2E User' },
    app_metadata: { provider: 'email' },
  },
  checkoutRedirect: 'about:blank?e2e_checkout=success',
  portalRedirect: 'about:blank?e2e_portal=open',
};

function fakeSession(user) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nowSec + 3600,
    refresh_token: 'e2e-refresh-token',
    user,
  };
}

/**
 * Installe les routes de mock sur une page et renvoie un contrôleur.
 * @param {import('@playwright/test').Page} page
 * @param {UmbeliE2EOptions} [options]
 */
export async function installUmbeliMocks(page, options = {}) {
  const opts = { ...DEFAULTS, ...options, login: { ...DEFAULTS.login, ...(options.login || {}) } };
  const user = { ...DEFAULTS.user, ...(options.user || {}) };

  let credentialsValid = false;
  let sessionValid = false;
  /** @type {Subscription} */
  let sub = { plan: 'free', status: 'inactive', periodEnd: null };

  // Catch-all Supabase auth EN PREMIER (priorité la plus basse en Playwright).
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/auth/v1/user**', (route) =>
    sessionValid
      ? route.fulfill({ json: user })
      : route.fulfill({ status: 401, json: { message: 'no session' } }),
  );
  await page.route('**/auth/v1/token**', (route) => {
    if (credentialsValid) {
      sessionValid = true;
      return route.fulfill({ json: fakeSession(user) });
    }
    return route.fulfill({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    });
  });
  await page.route('**/auth/v1/logout**', (route) => {
    sessionValid = false;
    return route.fulfill({ status: 204, body: '' });
  });

  // Backend billing (Stripe).
  await page.route('**/stripe/subscription**', (route) => route.fulfill({ json: sub }));
  await page.route('**/stripe/auto-provision**', (route) => route.fulfill({ json: sub }));
  await page.route('**/stripe/create-checkout**', (route) =>
    route.fulfill({ json: { url: opts.checkoutRedirect } }),
  );
  await page.route('**/stripe/portal**', (route) => route.fulfill({ json: { url: opts.portalRedirect } }));

  return {
    allowLogin: () => { credentialsValid = true; },
    denyLogin: () => { credentialsValid = false; },
    /** @param {Partial<Subscription>} s */
    setSubscription: (s) => { sub = { ...sub, ...s }; },
    asGuest: async () => {
      if (!opts.guestStorageKey) throw new Error('guestStorageKey non configuré pour cette app');
      const key = opts.guestStorageKey;
      await page.addInitScript((k) => window.localStorage.setItem(k, 'true'), key);
    },
    loginViaUI: async (o = {}) => {
      const prefix = o.lang === 'en' ? '/en' : '';
      credentialsValid = true;
      await page.goto(`${prefix}${opts.login.authPath}`);
      await page.locator(opts.login.emailSelector).fill(opts.login.email);
      await page.locator(opts.login.passwordSelector).fill(opts.login.password);
      await page.getByRole('button', { name: opts.login.submitName }).click();
      await page.waitForURL(`**${prefix}${opts.login.appPath}`);
    },
    get checkoutRedirect() { return opts.checkoutRedirect; },
    get portalRedirect() { return opts.portalRedirect; },
  };
}

/**
 * Fabrique un `test` Playwright étendu avec la fixture `mock`.
 * @param {UmbeliE2EOptions} [options]
 */
export function createUmbeliTest(options = {}) {
  const test = base.extend({
    mock: async ({ page }, use) => {
      const controller = await installUmbeliMocks(page, options);
      await use(controller);
    },
  });
  return { test, expect };
}

/** Remplit un champ contenteditable (composer in-app). */
export async function fillEditable(page, testId, value) {
  const el = page.getByTestId(testId);
  await el.click();
  await el.fill(value);
}

export { expect };
