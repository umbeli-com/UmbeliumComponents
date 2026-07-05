// @ts-check
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

/**
 * Charge et résume une acceptance-checklist (definition of done).
 * @param {string} path Chemin vers acceptance.yaml.
 */
export function loadAcceptance(path) {
  const doc = /** @type {any} */ (load(readFileSync(path, 'utf8')));
  const features = doc.features ?? [];
  const required = features.filter((f) => f.status === 'required');
  const optional = features.filter((f) => f.status === 'optional');
  const done = required.filter((f) => f.test === 'done');
  const blocked = required.filter((f) => f.test === 'blocked');
  const todo = required.filter((f) => f.test === 'todo');
  const pct = required.length ? Math.round((done.length / required.length) * 100) : 100;
  return { app: doc.app, features, required, optional, done, blocked, todo, pct };
}

/**
 * Imprime le résumé et renvoie le code de sortie (0 = livrable).
 * @param {string} path
 * @param {{ allowBlocked?: boolean }} [opts]
 */
export function reportAcceptance(path, opts = {}) {
  const a = loadAcceptance(path);
  const log = console.log;
  log(`\n  Acceptance — ${a.app}`);
  log(`  ${'─'.repeat(48)}`);
  log(`  Required : ${a.done.length}/${a.required.length} done (${a.pct}%)`);
  if (a.blocked.length) log(`  Blocked  : ${a.blocked.map((f) => f.id).join(', ')}`);
  if (a.todo.length) log(`  TODO     : ${a.todo.map((f) => f.id).join(', ')}`);
  log(`  Optional : ${a.optional.filter((f) => f.test === 'done').length}/${a.optional.length} done`);
  log('');

  const missing = opts.allowBlocked ? a.todo : [...a.todo, ...a.blocked];
  if (missing.length) {
    console.error(`  ❌ NON livrable — ${missing.length} feature(s) required non couverte(s).`);
    return 1;
  }
  if (a.blocked.length) {
    console.warn(`  ⚠️  Livrable en mock, mais ${a.blocked.length} smoke(s) staging à câbler.`);
  }
  log('  ✅ Toutes les features required sont couvertes.');
  return 0;
}
