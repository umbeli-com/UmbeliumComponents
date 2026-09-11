// @ts-check
import { expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Assertions UI partagées pour les suites Playwright des apps Umbeli.
 *
 * Sept apps recopiaient les mêmes sondes de layout (overflow horizontal, carte
 * auth centrée, empilement vertical, cible tactile minimale, vouvoiement,
 * captures d'écran). Elles vivent désormais ICI, en un seul endroit, pour que
 * chaque spec reste DRY et que le seuil de qualité soit identique partout.
 *
 * Ce module n'est PAS un test : il est seulement importé. Il ne fait aucune
 * hypothèse sur l'app (pas de sélecteur, pas de route) — on lui passe des
 * `Page` / `Locator` déjà résolus par la spec appelante.
 *
 * Plain ESM, aucun build : Playwright et Node importent la source directement.
 */

/**
 * Racine des captures — relative au cwd (= racine de l'app quand Playwright
 * tourne), donc portable partout (CI incluse) ; surchargeable via SHOTS_DIR
 * pour une revue locale.
 */
export const SHOTS = process.env.SHOTS_DIR || join(process.cwd(), 'e2e', '__screens__');

/** Viewport mobile de référence de la suite (iPhone 12/13 portrait). */
export const MOBILE = { width: 390, height: 844 };

/** Viewport desktop de référence de la suite. */
export const DESKTOP = { width: 1280, height: 800 };

/**
 * Vrai si le scope est une `Page` et non un `Locator`.
 *
 * NB : `Page` possède AUSSI une méthode `innerText(selector)`, donc on ne peut
 * pas se fier au duck-typing sur `innerText` — on teste `goto`, qui n'existe
 * que sur la Page.
 * @param {any} scope
 * @returns {boolean}
 */
function isPage(scope) {
  return !!scope && typeof scope.goto === 'function';
}

/**
 * Capture pleine page dans le dossier de captures partagé.
 * @param {import('@playwright/test').Page} page
 * @param {string} name Nom du fichier, sans extension.
 * @returns {Promise<void>}
 */
export async function shoot(page, name) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

/**
 * Débordement horizontal du document, en px (0/1 = aucun, la sous-pixellisation
 * arrondissant parfois à 1).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function horizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/**
 * Assertion : la page ne scrolle PAS horizontalement (tolérance 1px d'arrondi).
 * @param {import('@playwright/test').Page} page
 * @param {string} [label] Contexte ajouté au message d'échec (ex: 'login mobile').
 * @param {number} [tolPx] Tolérance en px (défaut 1).
 * @returns {Promise<void>}
 */
export async function expectNoHScroll(page, label = '', tolPx = 1) {
  const o = await horizontalOverflow(page);
  expect(o, `débordement horizontal de ${o}px${label ? ` sur ${label}` : ''}`).toBeLessThanOrEqual(
    tolPx,
  );
}

/**
 * Texte visible d'un scope (Page → <body>, Locator → l'élément).
 * @param {import('@playwright/test').Page|import('@playwright/test').Locator} scope
 * @returns {Promise<string>}
 */
async function textOf(scope) {
  if (isPage(scope)) {
    return /** @type {import('@playwright/test').Page} */ (scope).locator('body').innerText();
  }
  return /** @type {import('@playwright/test').Locator} */ (scope).innerText();
}

/**
 * Neutralise les passages `ignore` en les remplaçant par des espaces de MÊME
 * longueur : le scan de tutoiement ne les voit plus, mais tous les index restent
 * alignés sur le texte d'origine (donc le contexte affiché reste juste).
 *
 * Les motifs sont appliqués sans tenir compte de la casse (le texte scanné est
 * déjà en minuscules) et sur toutes les occurrences.
 *
 * @param {string} text Texte déjà passé en minuscules.
 * @param {ReadonlyArray<string|RegExp>} ignore
 * @returns {string}
 */
function maskIgnored(text, ignore) {
  let out = text;
  for (const pat of ignore) {
    const re =
      pat instanceof RegExp
        ? // `Set` dédoublonne : un motif déjà en /i/ ne produit pas un « ii » invalide.
          new RegExp(pat.source, [...new Set([...pat.flags.replace(/[gy]/g, ''), 'g', 'i'])].join(''))
        : new RegExp(String(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, (m) => ' '.repeat(m.length));
  }
  return out;
}

/**
 * Garde-fou vouvoiement — la copie de l'agence est unifiée sur « vous/votre »
 * (jamais « tu/ton »). À appliquer aux ÉCRANS PROPRES à l'app (login, signup,
 * dashboard, facturation, compte) ; PAS aux copies vendorisées d'autres apps.
 *
 *  - négatif (toujours) : aucun pronom/possessif de tutoiement n'est rendu.
 *  - positif (optionnel) : au moins un « vous/votre/vos » — uniquement là où il
 *    y a réellement de la prose (le chrome d'un dashboard en contient peu, d'où
 *    `{ positive: false }`).
 *
 * Landings : « ton » est parfois un nom légitime (« un ton clair ») et déclenche
 * un FAUX POSITIF. Échappatoire : `{ ignore: [/un ton clair/] }` — le passage est
 * masqué pour le seul scan de tutoiement (le contrôle positif, lui, continue de
 * lire la copie entière).
 *
 * @param {import('@playwright/test').Page|import('@playwright/test').Locator} scope
 * @param {{ positive?: boolean, ignore?: ReadonlyArray<string|RegExp> }} [options]
 * @returns {Promise<void>}
 */
export async function expectVouvoiement(scope, { positive = true, ignore = [] } = {}) {
  const raw = await textOf(scope);
  const text = raw.toLowerCase();
  const scanned = ignore.length ? maskIgnored(text, ignore) : text;

  // NB : en JS `\b` est ASCII-only, donc « êtes » se lirait comme frontière +
  // "tes" et ferait un faux positif sur un vouvoiement parfaitement correct
  // (« Vous êtes… »). On utilise des lookarounds sur les lettres accentuées
  // plutôt que `\b` pour les tokens de tutoiement.
  const tu = scanned.match(/(?<![a-zà-öø-ÿ])(tu|ton|ta|tes|toi)(?![a-zà-öø-ÿ])/);
  const at = tu?.index ?? 0;
  const ctx = tu ? raw.slice(Math.max(0, at - 30), at + 30) : '';
  expect(tu, `tutoiement « ${tu?.[0]} » détecté — contexte : …${ctx}…`).toBeNull();

  if (positive) {
    expect(
      /\b(vous|votre|vos)\b/.test(text),
      'vouvoiement attendu (un « vous/votre/vos ») dans la copie visible',
    ).toBe(true);
  }
}

/**
 * Boîte englobante d'un locator, avec message d'échec explicite.
 * @param {import('@playwright/test').Locator} el
 * @param {string} label
 * @returns {Promise<{x:number,y:number,width:number,height:number}>}
 */
async function boxOf(el, label) {
  const box = await el.boundingBox();
  expect(box, `${label || 'élément'} : boîte englobante introuvable (élément non visible ?)`)
    .not.toBeNull();
  return /** @type {{x:number,y:number,width:number,height:number}} */ (box);
}

/**
 * Assertion : l'élément est à peu près centré horizontalement dans le viewport
 * et sa largeur est bornée à [minW, maxW]. Utilisé pour la carte d'auth.
 *
 * Signature canonique : `expectCenteredCard(card, options)` — la Page est
 * déduite du locator (`locator.page()`). La forme historique des specs Webum
 * `expectCenteredCard(page, card, options)` reste acceptée telle quelle.
 *
 * @param {import('@playwright/test').Page|import('@playwright/test').Locator} cardOrPage
 * @param {import('@playwright/test').Locator|{minW?:number,maxW?:number,tolPx?:number}} [cardOrOptions]
 * @param {{minW?:number,maxW?:number,tolPx?:number}} [maybeOptions]
 * @returns {Promise<void>}
 */
export async function expectCenteredCard(cardOrPage, cardOrOptions, maybeOptions) {
  const legacy = isPage(cardOrPage);
  const card = /** @type {import('@playwright/test').Locator} */ (
    legacy ? cardOrOptions : cardOrPage
  );
  const opts = /** @type {{minW?:number,maxW?:number,tolPx?:number}} */ (
    (legacy ? maybeOptions : /** @type {any} */ (cardOrOptions)) || {}
  );
  const { minW = 280, maxW = 460, tolPx = 12 } = opts;

  const page = legacy
    ? /** @type {import('@playwright/test').Page} */ (cardOrPage)
    : card.page();

  const box = await boxOf(card, 'carte');
  // `viewportSize()` est null quand le contexte n'en fixe aucun → on retombe sur
  // la largeur réelle du document.
  const vw =
    page.viewportSize()?.width ?? (await page.evaluate(() => document.documentElement.clientWidth));
  const drift = Math.abs(box.x + box.width / 2 - vw / 2);

  expect(
    drift,
    `centre de la carte décalé de ${Math.round(drift)}px par rapport au centre du viewport`,
  ).toBeLessThanOrEqual(tolPx);
  expect(
    box.width,
    `largeur de carte ${Math.round(box.width)}px : doit être ≤ ${maxW}`,
  ).toBeLessThanOrEqual(maxW);
  expect(
    box.width,
    `largeur de carte ${Math.round(box.width)}px : doit être ≥ ${minW}`,
  ).toBeGreaterThanOrEqual(minW);
}

/**
 * Assertion : `top` est entièrement AU-DESSUS de `bottom` (aucun chevauchement
 * vertical), à la tolérance près.
 * @param {import('@playwright/test').Locator} top
 * @param {import('@playwright/test').Locator} bottom
 * @param {string} [label]
 * @param {number} [tolPx]
 * @returns {Promise<void>}
 */
export async function expectStackedAbove(top, bottom, label = '', tolPx = 2) {
  const a = await boxOf(top, label ? `${label} (élément du haut)` : 'élément du haut');
  const b = await boxOf(bottom, label ? `${label} (élément du bas)` : 'élément du bas');
  expect(
    a.y + a.height,
    `${label || 'empilement'} : bas du 1er élément (${Math.round(a.y + a.height)}) attendu au-dessus du haut du 2e (${Math.round(b.y)})`,
  ).toBeLessThanOrEqual(b.y + tolPx);
}

/**
 * Assertion : `left` est entièrement À GAUCHE de `right` (aucun chevauchement
 * horizontal), à la tolérance près.
 * @param {import('@playwright/test').Locator} left
 * @param {import('@playwright/test').Locator} right
 * @param {string} [label]
 * @param {number} [tolPx]
 * @returns {Promise<void>}
 */
export async function expectLeftOf(left, right, label = '', tolPx = 2) {
  const a = await boxOf(left, label ? `${label} (élément de gauche)` : 'élément de gauche');
  const b = await boxOf(right, label ? `${label} (élément de droite)` : 'élément de droite');
  expect(
    a.x + a.width,
    `${label || 'disposition'} : bord droit du 1er élément (${Math.round(a.x + a.width)}) attendu ≤ bord gauche du 2e (${Math.round(b.x)})`,
  ).toBeLessThanOrEqual(b.x + tolPx);
}

/**
 * Assertion : un contrôle fait au moins `min` px de haut (défaut 36 — cible
 * tactile confortable).
 * @param {import('@playwright/test').Locator} el
 * @param {number} [min]
 * @param {string} [label]
 * @returns {Promise<void>}
 */
export async function expectMinHeight(el, min = 36, label = '') {
  const b = await boxOf(el, label || 'contrôle');
  expect(
    b.height,
    `${label || 'contrôle'} : hauteur ${Math.round(b.height)}px, doit être ≥ ${min}px`,
  ).toBeGreaterThanOrEqual(min);
}
