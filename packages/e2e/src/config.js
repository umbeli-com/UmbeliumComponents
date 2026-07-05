// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Preset de config Playwright pour les apps Umbeli.
 *
 * Convention agence : port E2E DÉDIÉ par app (≠ 5173 du dev) pour ne jamais
 * réutiliser par erreur une autre app lancée sur le port par défaut.
 *
 * @param {object} opts
 * @param {number} opts.port Port E2E dédié (ex: 5290 pour Anonymium).
 * @param {string} [opts.webServerCommand] Commande pour lancer l'app (défaut: vite --mode e2e).
 * @param {string} [opts.testDir]
 * @param {import('@playwright/test').PlaywrightTestConfig} [opts.override] Fusion finale.
 */
export function defineUmbeliE2EConfig(opts) {
  const port = Number(process.env.E2E_PORT ?? opts.port);
  const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
  const command =
    opts.webServerCommand ?? `npm run dev -- --mode e2e --port ${port}`;

  return defineConfig({
    testDir: opts.testDir ?? './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
      ? [['github'], ['html', { open: 'never' }]]
      : [['list'], ['html', { open: 'never' }]],
    timeout: 30_000,
    expect: { timeout: 7_000 },
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: process.env.E2E_BASE_URL
      ? undefined
      : {
          command,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
    ...(opts.override || {}),
  });
}
