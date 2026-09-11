#!/usr/bin/env node
/**
 * Migre la palette locale d'une app vers tokens.css, en ne gardant que ce qui
 * lui est propre.
 *
 *   node scripts/migrate-tokens.mjs ../Dialum/src/index.css [--write]
 *
 * Le principe : un token dont la valeur est DÉJÀ celle du canon est de la
 * duplication pure et disparaît ; un token qui diverge est l'identité de l'app
 * (le bleu de Scrapium, le dégradé sombre de Monitorum) et survit dans un petit
 * bloc d'override.
 *
 * Piège de cascade, la raison d'être de ce script : Dialum écrit sa palette dans
 * `html { }` (spécificité 0,0,1) alors que tokens.css écrit dans `:root` (0,1,0).
 * Garder le bloc de l'app tel quel ferait donc gagner le PACKAGE, en silence, et
 * l'app perdrait son identité sans que rien ne casse. Les overrides sont pour
 * cette raison réécrits avec exactement les sélecteurs du canon, placés après
 * l'import : même spécificité + plus loin dans la cascade = l'app gagne.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './vendor-map.mjs'

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
const c = (k, s) => `${C[k]}${s}${C.off}`

const LIGHT_SELECTOR = ':root'
const DARK_SELECTOR = "html.dark,\n:root[data-theme='dark']"

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const files = args.filter((a) => !a.startsWith('--'))

function normalize(value) {
  const v = value.trim().toLowerCase().replace(/\s+/g, '')
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v)
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
  const rgb = /^rgba?\((\d+),(\d+),(\d+)(?:,1(?:\.0+)?)?\)$/.exec(v)
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
  return v
}

function readCanonical() {
  const css = readFileSync(join(REPO_ROOT, 'packages/ui/dist/styles/tokens.css'), 'utf8')
  const light = new Map()
  const dark = new Map()
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const target = /dark/i.test(block[1]) ? dark : light
    for (const d of block[2].matchAll(/(--theme-[a-z0-9-]+)\s*:\s*([^;]+);/g)) target.set(d[1], d[2].trim())
  }
  return { light, dark }
}

/** Blocs du fichier de l'app qui ne contiennent QUE des déclarations --theme-*. */
function findPaletteBlocks(css) {
  const blocks = []
  for (const m of css.matchAll(/([^{}]*?)\{([^{}]*)\}/g)) {
    const body = m[2]
    const themeDecls = [...body.matchAll(/(--theme-[a-z0-9-]+)\s*:\s*([^;]+);/g)]
    if (!themeDecls.length) continue
    // Le groupe 1 ratisse TOUT ce qui précède l'accolade, y compris les `@import`
    // de l'app. Les inclure dans la découpe supprimerait l'import de Tailwind de
    // Dialum avec la palette — le sélecteur commence après le dernier `;` ou `}`.
    const lead = m[1]
    const selectorStart = m.index + Math.max(lead.lastIndexOf(';'), lead.lastIndexOf('}')) + 1
    // Ce qui n'est pas un token de thème appartient à l'app et doit survivre :
    // --mgr-radius du Manager, la famille --bg/--ink/--accent de Noesium.
    const rest = body
      .replace(/(--theme-[a-z0-9-]+)\s*:\s*([^;]+);/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    blocks.push({
      selector: css.slice(selectorStart, m.index + lead.length).trim(),
      start: selectorStart,
      end: m.index + m[0].length,
      decls: new Map(themeDecls.map((d) => [d[1], d[2].trim()])),
      rest,
      isDark: /dark/i.test(m[1]),
    })
  }
  return blocks
}

const canonical = readCanonical()
let failures = 0

for (const file of files) {
  const css = readFileSync(file, 'utf8')
  const blocks = findPaletteBlocks(css)

  console.log(`\n${c('bold', file)}`)
  if (!blocks.length) { console.log(c('dim', '  aucun bloc de palette')); continue }

  const overrides = { light: new Map(), dark: new Map() }
  const carried = { light: [], dark: [] }
  for (const b of blocks) {
    if (b.rest) (b.isDark ? carried.dark : carried.light).push(b.rest)
  }
  let removed = 0
  for (const b of blocks) {
    const canonSet = b.isDark ? canonical.dark : canonical.light
    const target = b.isDark ? overrides.dark : overrides.light
    for (const [token, value] of b.decls) {
      const canonValue = canonSet.get(token)
      if (canonValue !== undefined && normalize(canonValue) === normalize(value)) removed++
      else target.set(token, value)
    }
  }

  const kept = overrides.light.size + overrides.dark.size
  const carriedCount = carried.light.length + carried.dark.length
  console.log(`  ${c('green', `${removed} token(s) dupliqués supprimés`)}, ${kept} gardé(s) comme identité de l'app`
    + (carriedCount ? c('dim', ` (+ ${carriedCount} bloc(s) de déclarations non-thème reportées)`) : ''))

  // Le fichier réécrit : import du canon, puis les seuls tokens divergents.
  let out = css
  for (const b of [...blocks].sort((a, b2) => b2.start - a.start)) {
    out = out.slice(0, b.start) + out.slice(b.end)
  }
  out = out.replace(/\n{3,}/g, '\n\n').replace(/^\s*\n/, '')

  // Pas d'`@import` du canon ici : les apps chargent déjà `@umbeli-com/ui/styles`
  // depuis leur point d'entrée, et cette feuille commence par les tokens. Ce qui
  // compte, c'est l'ORDRE — voir le rappel imprimé en fin de migration.
  const header = [
    '/* Palette de la suite : fournie par @umbeli-com/ui/styles, chargé avant ce',
    '   fichier depuis le point d\'entrée. Ne subsistent ici que les tokens propres',
    "   à cette app, avec les sélecteurs du canon — même spécificité, chargés après,",
    '   donc ces valeurs-ci gagnent. */',
  ]
  const renderBlock = (selector, map, extra) => {
    const lines = [...map].map(([t, v]) => `  ${t}: ${v};`)
    for (const chunk of extra) {
      for (const line of chunk.split('\n')) if (line.trim()) lines.push(`  ${line.trim()}`)
    }
    return lines.length ? `${selector} {\n${lines.join('\n')}\n}\n` : ''
  }

  const palette = [
    renderBlock(LIGHT_SELECTOR, overrides.light, carried.light),
    renderBlock(DARK_SELECTOR, overrides.dark, carried.dark),
  ].filter(Boolean).join('\n')

  // Les @import CSS doivent précéder toute règle : on réinsère après ceux qui existent.
  const existingImports = [...out.matchAll(/^@import[^;]+;\s*$/gm)]
  const insertAt = existingImports.length
    ? existingImports[existingImports.length - 1].index + existingImports[existingImports.length - 1][0].length
    : 0
  const rebuilt = `${out.slice(0, insertAt)}\n${header.join('\n')}\n\n${palette}\n${out.slice(insertAt)}`.replace(/\n{3,}/g, '\n\n')

  // Auto-contrôle : chaque token du fichier d'origine doit toujours RÉSOUDRE vers
  // sa valeur d'origine — soit via le canon, soit via l'override conservé.
  let drift = 0
  for (const b of blocks) {
    const canonSet = b.isDark ? canonical.dark : canonical.light
    const overrideSet = b.isDark ? overrides.dark : overrides.light
    for (const [token, value] of b.decls) {
      const effective = overrideSet.get(token) ?? canonSet.get(token)
      if (effective === undefined || normalize(effective) !== normalize(value)) {
        console.log(c('red', `    ✗ ${token} résoudrait vers ${effective ?? '(rien)'} au lieu de ${value}`))
        drift++
      }
    }
  }
  if (drift) { failures++; console.log(c('red', `  ✗ ${drift} dérive(s) — non écrit`)); continue }
  console.log(c('green', '  ✓ chaque token résout vers sa valeur d\'origine'))

  // Rien d'autre que la palette ne doit disparaître. Une première version de ce
  // script emportait l'`@import` de Tailwind de Dialum avec le bloc de palette,
  // parce que le sélecteur capturé ratissait les lignes qui le précédaient.
  const lost = []
  for (const imp of css.matchAll(/@import[^;]+;/g)) {
    if (!rebuilt.includes(imp[0])) lost.push(imp[0])
  }
  const ruleCount = (text) =>
    [...text.matchAll(/([^{}]*?)\{([^{}]*)\}/g)]
      .filter((m) => !/(--theme-[a-z0-9-]+)\s*:/.test(m[2])).length
  const before = ruleCount(css)
  const after = ruleCount(rebuilt)
  if (after < before) lost.push(`${before - after} règle(s) CSS`)

  if (lost.length) {
    failures++
    console.log(c('red', `  ✗ la réécriture perdrait : ${lost.join(', ')} — non écrit`))
    continue
  }
  console.log(c('green', `  ✓ imports et ${after} règle(s) CSS préservés`))

  if (WRITE) {
    writeFileSync(file, rebuilt)
    console.log(c('bold', '  → écrit'))
    console.log(c('yellow', "  ⚠ vérifier le point d'entrée : `@umbeli-com/ui/styles` doit être importé"))
    console.log(c('yellow', `    AVANT ${file.split('/').pop()}, sinon le canon écrase les overrides ci-dessus.`))
  } else {
    console.log(c('dim', '  (simulation — relancer avec --write)'))
  }
}

process.exit(failures ? 1 : 0)
