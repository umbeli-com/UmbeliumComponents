#!/usr/bin/env node
/**
 * Carte des copies vendorisées de la suite : qui embarque quoi, et sous quelle forme.
 * `pnpm vendor:list`
 */
import { discoverTargets, canonicalVersion, PACKAGES } from './vendor-map.mjs'

const targets = discoverTargets()
const byApp = new Map()
for (const t of targets) {
  if (!byApp.has(t.app)) byApp.set(t.app, [])
  byApp.get(t.app).push(t)
}

console.log(`\n\x1b[1mSource canonique\x1b[0m`)
for (const p of PACKAGES) console.log(`  @umbeli-com/${p.padEnd(8)} v${canonicalVersion(p)}`)

console.log(`\n\x1b[1m${targets.length} copie(s) dans ${byApp.size} app(s)\x1b[0m`)
for (const [app, list] of [...byApp].sort()) {
  console.log(`\n  ${app}`)
  for (const t of list.sort((a, b) => a.pkg.localeCompare(b.pkg))) {
    const flags = [t.kind === 'src' ? 'src+dist' : 'dist', t.orphan ? '\x1b[33mORPHELINE\x1b[0m' : null]
      .filter(Boolean).join(' ')
    console.log(`    ${t.pkg.padEnd(8)} ${flags.padEnd(20)} ${t.rel}`)
  }
}
console.log(`\n\x1b[2mpnpm vendor:check  → détecte la dérive · pnpm vendor:sync → la corrige\x1b[0m\n`)
