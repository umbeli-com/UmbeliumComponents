// @ts-check
import { expect } from '@playwright/test';

/**
 * Assertions réseau — vérifier le CONTRAT (payload envoyé + forme de la réponse),
 * pas seulement l'effet UI. Complète les mocks (§6 de la TODO agence).
 */

/**
 * Déclenche `action`, capture la 1re requête matchant `urlPattern`, et renvoie
 * un objet pratique { method, url, headers, json } pour asserter le payload.
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} urlPattern
 * @param {() => Promise<any>} action
 */
export async function captureRequest(page, urlPattern, action) {
  const [req] = await Promise.all([page.waitForRequest(urlPattern), action()]);
  let json;
  try { json = req.postDataJSON(); } catch { json = undefined; }
  return {
    method: req.method(),
    url: req.url(),
    headers: req.headers(),
    postData: req.postData(),
    json,
  };
}

/**
 * Déclenche `action`, attend la réponse matchant `urlPattern`, et vérifie que
 * le JSON contient toutes les clés attendues (contract check léger).
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} urlPattern
 * @param {string[]} requiredKeys
 * @param {() => Promise<any>} action
 */
export async function expectResponseShape(page, urlPattern, requiredKeys, action) {
  const [res] = await Promise.all([page.waitForResponse(urlPattern), action()]);
  const body = await res.json();
  const target = Array.isArray(body) ? (body[0] ?? {}) : body;
  for (const key of requiredKeys) {
    expect(target, `clé "${key}" absente de la réponse ${res.url()}`).toHaveProperty(key);
  }
  return body;
}
