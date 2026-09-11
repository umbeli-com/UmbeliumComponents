#!/usr/bin/env node
/**
 * Ce qui change à l'écran si une app abandonne sa palette locale pour tokens.css.
 *
 *   node scripts/token-diff.mjs <fichier-css-de-l-app> [...]
 *
 * Migrer une app vers les tokens partagés, c'est supprimer son bloc de palette et
 * importer celle du package. Le risque n'est pas technique — le build passera — il
 * est visuel, et invisible depuis un terminal. Ce script le rend lisible : pour
 * chaque token, l'ancienne valeur, la nouvelle, et si elle bouge.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './vendor-map.mjs'

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
const c = (k, s) => `${C[k]}${s}${C.off}`

/**
 * Extrait les déclarations `--theme-*`, en séparant clair et sombre.
 * Un sélecteur qui mentionne `dark` gouverne le thème sombre — c'est la forme que
 * prennent les sept palettes de la suite (`html.dark`, `:root[data-theme='dark']`).
 */
function readPalette(css) {
  const light = new Map()
  const dark = new Map()
  const blockRe = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].trim()
    const isDark = /dark/i.test(selector)
    const target = isDark ? dark : light
    for (const decl of m[2].matchAll(/(--theme-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      target.set(decl[1], decl[2].trim())
    }
  }
  return { light, dark }
}

const canonical = readPalette(readFileSync(join(REPO_ROOT, 'packages/ui/dist/styles/tokens.css'), 'utf8'))

let anyShift = false

for (const file of process.argv.slice(2)) {
  let app
  try { app = readPalette(readFileSync(file, 'utf8')) } catch { console.log(c('red', `✗ illisible : ${file}`)); continue }

  if (!app.light.size && !app.dark.size) {
    console.log(`\n${c('bold', file)}\n  ${c('dim', 'aucune déclaration --theme-* — rien à migrer')}`)
    continue
  }

  console.log(`\n${c('bold', file)}`)
  for (const [mode, appSet, canonSet] of [['clair', app.light, canonical.light], ['sombre', app.dark, canonical.dark]]) {
    if (!appSet.size) continue
    const shifts = []
    const dropped = []
    for (const [token, value] of appSet) {
      const canonValue = canonSet.get(token)
      if (canonValue === undefined) dropped.push(token)
      else if (normalize(canonValue) !== normalize(value)) shifts.push([token, value, canonValue])
    }
    const gained = [...canonSet.keys()].filter((t) => !appSet.has(t))

    console.log(`  ${mode} : ${appSet.size} token(s) locaux`)
    for (const [token, before, after] of shifts) {
      anyShift = true
      console.log(`    ${c('yellow', 'CHANGE')} ${token}`)
      console.log(`             ${before}  →  ${c('bold', after)}`)
    }
    if (dropped.length) {
      console.log(`    ${c('red', 'PERDU ')} ${dropped.length} token(s) que tokens.css ne définit pas :`)
      console.log(c('dim', `             ${dropped.join(', ')}`))
      console.log(c('dim', '             → à garder dans un bloc d\'override APRÈS l\'import.'))
    }
    if (!shifts.length && !dropped.length) console.log(`    ${c('green', 'identique')} — migration sans effet visuel`)
    if (gained.length) console.log(c('dim', `    +${gained.length} token(s) hérités que l'app ne définissait pas`))
  }
}

/** `#FFF`, `#ffffff` et `rgb(255,255,255)` sont la même couleur. */
function normalize(value) {
  const v = value.trim().toLowerCase().replace(/\s+/g, '')
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v)
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
  const rgb = /^rgba?\((\d+),(\d+),(\d+)(?:,1(?:\.0+)?)?\)$/.exec(v)
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
  return v
}

console.log(anyShift ? c('dim', '\nLes lignes CHANGE sont les seules visibles par un utilisateur.\n') : c('green', '\n✓ Aucun décalage de couleur.\n'))
