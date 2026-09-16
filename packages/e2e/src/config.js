// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Preset de config Playwright pour les apps Umbeli.
 *
 * Convention agence : port E2E DÉDIÉ par app (≠ 5173 du dev) pour ne jamais
 * réutiliser par erreur une autre app lancée sur le port par défaut.
 *
 * ── Transparence ────────────────────────────────────────────────────────────
 * Le preset ne doit JAMAIS imposer sa peau à l'app. Toute option Playwright se
 * passe À PLAT dans `opts` (aux côtés de `port`) et se FUSIONNE EN PROFONDEUR
 * avec le preset — `use`, `expect` et `webServer` compris. Passer un seul champ
 * de `use` n'efface donc plus le reste (le `baseURL` dérivé du port survit) :
 *
 *   defineUmbeliE2EConfig({
 *     port: 5180,
 *     workers: 1, fullyParallel: false, retries: 2, timeout: 45_000,
 *     outputDir: './e2e/.output',
 *     expect: { timeout: 10_000 },                       // fusionné
 *     use: { locale: 'fr-FR', timezoneId: 'America/Toronto' }, // baseURL gardé
 *     webServer: { command: 'npm run dev', stderr: 'pipe', env: VITE_ENV },
 *   });                                                   // command/url/timeout gardés
 *
 * ── Plusieurs serveurs ──────────────────────────────────────────────────────
 * Un monorepo qui boote api + web + admin passe `webServers: [...]` (ou un
 * tableau dans `webServer`). Chaque entrée hérite des défauts du preset
 * (`reuseExistingServer`, `timeout`), et le serveur dérivé du port est remplacé.
 *
 * ── Règles de fusion ────────────────────────────────────────────────────────
 *   • objets simples          → fusionnés récursivement
 *   • tableaux, RegExp, null  → remplacés tels quels (reporter, projects,
 *                               testIgnore, testMatch…)
 *   • champ À PLAT laissé à `undefined` → traité comme ABSENT : le défaut du
 *     preset survit. C'est le comportement historique (`opts.testDir ?? './e2e'`),
 *     indispensable pour `testDir: process.env.X` quand X n'est pas défini.
 *     Seul `webServer: undefined` garde son sens de coupure (voir plus bas).
 *   • dans `override` (dernière passe) → `undefined` REMPLACE, comme le spread
 *     d'avant (`...opts.override`).
 *
 * ── Variables d'environnement (l'env a TOUJOURS le dernier mot) ─────────────
 *   • `E2E_PORT`     — relocalise le port dédié.
 *   • `E2E_BASE_URL` — cible une app DÉJÀ lancée : AUCUN webServer n'est démarré
 *     (ni celui du preset, ni ceux de l'app) et le baseURL devient cette valeur,
 *     y compris si l'app déclare son propre `use.baseURL` ou `override.use.baseURL`.
 *   • `E2E_BROWSERS` — "all" ou "chromium,firefox,webkit,mobile" (défaut chromium).
 *     Prime sur l'option `browsers`, pour qu'un run cross-browser global
 *     (`E2E_BROWSERS=all`) reste possible sur toutes les apps.
 *
 * @typedef {import('@playwright/test').PlaywrightTestConfig} PlaywrightTestConfig
 * @typedef {NonNullable<PlaywrightTestConfig['webServer']>} WebServerSpec
 *
 * @typedef {Omit<PlaywrightTestConfig, 'webServer'> & {
 *   port?: number,
 *   webServerCommand?: string,
 *   webServer?: WebServerSpec | any[] | null | false,
 *   webServers?: any[],
 *   browsers?: string,
 *   override?: PlaywrightTestConfig,
 * }} UmbeliE2EConfigOptions
 */

/** Clés propres au preset : tout le reste d'`opts` est un champ Playwright. */
const PRESET_ONLY_KEYS = new Set(['port', 'webServerCommand', 'webServers', 'browsers', 'override']);

/** Défauts appliqués à CHAQUE webServer (l'app garde le dernier mot). */
function webServerDefaults() {
  return { reuseExistingServer: !process.env.CI, timeout: 120_000 };
}

/**
 * Config Playwright d'une app Umbeli : preset + champs de l'app, fusionnés en
 * profondeur.
 *
 * @param {UmbeliE2EConfigOptions} [opts]
 *   `port` (port E2E dédié, ex: 5290), `webServerCommand` (défaut :
 *   `npm run dev -- --mode e2e --port <port>`), `webServers` (plusieurs
 *   serveurs), `browsers` (défaut programmatique de la matrice, qu'`E2E_BROWSERS`
 *   peut toujours écraser), `override` (dernière passe de fusion, profonde elle
 *   aussi) — plus n'importe quel champ `PlaywrightTestConfig` à plat.
 */
export function defineUmbeliE2EConfig(opts = {}) {
  const port = Number(process.env.E2E_PORT ?? opts.port);
  const hasPort = Number.isFinite(port);

  // Priorité : E2E_BASE_URL > override.use.baseURL > use.baseURL > localhost:<port>.
  // L'app qui déclare son propre baseURL le voit aussi servir d'`url` au webServer.
  const declaredBaseURL =
    process.env.E2E_BASE_URL ?? opts.override?.use?.baseURL ?? opts.use?.baseURL;

  if (declaredBaseURL === undefined && !hasPort) {
    throw new Error(
      "defineUmbeliE2EConfig : renseigne `port` (port E2E dédié de l'app), " +
        'ou `use.baseURL`, ou la variable E2E_BASE_URL.',
    );
  }

  const baseURL = declaredBaseURL ?? `http://localhost:${port}`;

  // Sans port ET sans commande explicite, on ne peut PAS fabriquer de commande de
  // démarrage : on ne lance rien plutôt que `npm run dev -- --port NaN`.
  const command =
    opts.webServerCommand ?? (hasPort ? `npm run dev -- --mode e2e --port ${port}` : undefined);

  /** @type {Record<string, any>} */
  const preset = {
    testDir: './e2e',
    // La config mock ne ramasse ni les smokes staging réels (e2e/staging/**) ni la
    // régression visuelle (e2e/visual/**) — chacun a sa propre config.
    testIgnore: ['**/staging/**', '**/visual/**'],
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
    projects: buildProjects(process.env.E2E_BROWSERS ?? opts.browsers),
    webServer: command === undefined ? undefined : { command, url: baseURL },
  };

  // Tout champ d'`opts` qui n'appartient pas au preset est un champ Playwright.
  // Un champ à plat laissé à `undefined` est ABSENT (le défaut du preset survit) :
  // c'est ce que faisait `opts.testDir ?? './e2e'` avant.
  /** @type {Record<string, any>} */
  const appFields = {};
  for (const key of Object.keys(opts)) {
    const value = /** @type {any} */ (opts)[key];
    if (!PRESET_ONLY_KEYS.has(key) && value !== undefined) appFields[key] = value;
  }
  if (opts.webServers !== undefined) appFields.webServer = opts.webServers;

  let config = mergeUmbeliE2EConfig(preset, appFields);
  config = mergeUmbeliE2EConfig(config, opts.override ?? {});

  // `webServer: undefined` posé explicitement garde son sens de coupure.
  const cutServer = 'webServer' in opts && opts.webServer === undefined && opts.webServers === undefined;

  // E2E_BASE_URL = « ça tourne déjà ailleurs » → on ne démarre plus rien.
  config.webServer =
    process.env.E2E_BASE_URL || cutServer ? undefined : normalizeWebServers(config.webServer);

  // L'env (E2E_BASE_URL) et la priorité annoncée doivent survivre aux fusions :
  // sans ça, `use.baseURL` de l'app réécraserait la valeur calculée plus haut.
  config.use = { ...config.use, baseURL };

  return defineConfig(/** @type {any} */ (config));
}

/**
 * Fusionne deux configs Playwright EN PROFONDEUR (`use`, `expect`, `webServer`,
 * `use.launchOptions`…). Tableaux, RegExp et valeurs primitives remplacent.
 * Exporté pour les apps qui déclinent plusieurs suites d'une même base.
 *
 * @template {Record<string, any>} T
 * @param {T} base
 * @param {Record<string, any>} patch
 * @returns {T & Record<string, any>}
 */
export function mergeUmbeliE2EConfig(base, patch) {
  const out = { ...base };
  for (const key of Object.keys(patch ?? {})) {
    const next = patch[key];
    out[/** @type {keyof T} */ (key)] =
      isPlainObject(next) && isPlainObject(out[key]) ? mergeUmbeliE2EConfig(out[key], next) : next;
  }
  return out;
}

/**
 * Projets navigateurs du preset, exposés pour les apps qui découpent leurs
 * projets autrement (un projet par service, par exemple) et veulent quand même
 * la matrice cross-browser.
 * @param {string} [spec] "all" | "chromium,firefox,webkit,mobile" — E2E_BROWSERS prime.
 */
export function umbeliE2EProjects(spec) {
  return buildProjects(process.env.E2E_BROWSERS ?? spec);
}

/**
 * Normalise `webServer` : `null`/`false` = aucun serveur ; un tableau = plusieurs
 * serveurs, chacun complété par les défauts du preset.
 * @param {any} value
 */
function normalizeWebServers(value) {
  if (value === undefined || value === null || value === false) return undefined;
  if (Array.isArray(value)) {
    const servers = value
      .filter((s) => isPlainObject(s))
      .map((s) => ({ ...webServerDefaults(), ...s }));
    return servers.length ? servers : undefined;
  }
  // Serveur unique : mêmes défauts que les entrées d'un tableau, l'app gagne.
  return isPlainObject(value) ? { ...webServerDefaults(), ...value } : value;
}

/**
 * Objet « littéral » (≠ tableau, RegExp, Date, instance de classe).
 * @param {any} value
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Construit la liste des projets Playwright selon E2E_BROWSERS.
 * @param {string|undefined} spec  "all" | "chromium,firefox,webkit,mobile" | undefined
 */
function buildProjects(spec) {
  /** @type {Record<string, { name: string, use: any }>} */
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
