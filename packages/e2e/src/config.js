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
    // La config mock ne ramasse ni les smokes staging réels (e2e/staging/**) ni la
    // régression visuelle (e2e/visual/**) — chacun a sa propre config.
    testIgnore: opts.testIgnore ?? ['**/staging/**', '**/visual/**'],
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
    // Cross-browser à la demande : E2E_BROWSERS=all (ou "chromium,firefox,webkit").
    // Défaut = chromium seul (vitesse). Ajoute un viewport mobile avec ...,mobile.
    projects: buildProjects(process.env.E2E_BROWSERS),
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

/**
 * Construit la liste des projets Playwright selon E2E_BROWSERS.
 * @param {string|undefined} spec  "all" | "chromium,firefox,webkit,mobile" | undefined
 */
function buildProjects(spec) {
  const catalog = {
    chromium: { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    webkit: { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    mobile: { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  };
  const wanted =
    !spec ? ['chromium']
    : spec === 'all' ? ['chromium', 'firefox', 'webkit', 'mobile']
    : spec.split(',').map((s) => s.trim()).filter((s) => catalog[s]);
  return (wanted.length ? wanted : ['chromium']).map((k) => catalog[k]);
}
