// @ts-check

/**
 * Crawler de solidité — détecte les éléments interactifs "morts" ou douteux
 * sur la page courante (§3 de la TODO agence). Purement DOM, aucun clic.
 *
 * - deadLinks     : <a> visibles avec href vide / "#" / javascript:void
 * - namelessButtons : <button> visibles sans nom accessible (ni texte, ni
 *                     aria-label, ni title) → smell UX/a11y
 * - disabledForever : indicatif — boutons disabled au chargement (souvent normal)
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{deadLinks: any[], namelessButtons: any[]}>}
 */
export async function auditInteractives(page) {
  return await page.evaluate(() => {
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const deadLinks = [];
    const namelessButtons = [];

    for (const a of Array.from(document.querySelectorAll('a'))) {
      if (!isVisible(a)) continue;
      const href = a.getAttribute('href');
      if (href === null || href.trim() === '' || href === '#' || /^javascript:\s*void/i.test(href)) {
        deadLinks.push({ text: (a.textContent || '').trim().slice(0, 50), href });
      }
    }
    for (const b of Array.from(document.querySelectorAll('button'))) {
      if (!isVisible(b)) continue;
      const name = (
        b.getAttribute('aria-label') ||
        b.textContent ||
        b.getAttribute('title') ||
        ''
      ).trim();
      if (!name) namelessButtons.push({ class: b.className.slice(0, 60) });
    }
    return { deadLinks, namelessButtons };
  });
}
