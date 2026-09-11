#!/usr/bin/env node
/**
 * Tout .scss d'un composant doit être atteignable depuis le styles/index.scss de son package.
 *
 * DetailedChart et LanguageSwitcher ont été exportés sans feuille de style : leurs classes
 * n'apparaissaient nulle part dans dist/styles/index.css et chaque app les affichait nues.
 * Un fichier de styles qui existe mais que personne n'`@use` produit exactement le même
 * silence — d'où ce garde-fou.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT, PACKAGES, canonicalDir } from './vendor-map.mjs'

const C = { red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
const c = (k, s) => `${C[k]}${s}${C.off}`

function scssFiles(dir, out = [], base = dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) scssFiles(full, out, base)
    // Les partiels `_x.scss` sont importés par d'autres feuilles, pas par l'index.
    else if (e.name.endsWith('.scss') && !e.name.startsWith('_')) out.push(full)
  }
  return out
}

let problems = 0

for (const pkg of PACKAGES) {
  const root = canonicalDir(pkg)
  const indexPath = join(root, 'src/styles/index.scss')
  const componentsDir = join(root, 'src/components')
  if (!existsSync(componentsDir)) continue

  const found = scssFiles(componentsDir)
  if (!found.length) continue

  if (!existsSync(indexPath)) {
    console.log(c('red', `✗ @umbeli-com/${pkg}: ${found.length} .scss mais pas de src/styles/index.scss`))
    problems += found.length
    continue
  }

  const index = readFileSync(indexPath, 'utf8')
  const missing = found.filter((f) => {
    // `@use '../components/Button/Button';` — on compare sur le chemin sans extension.
    const rel = f.slice(join(root, 'src/').length).replace(/\.scss$/, '')
    return !index.includes(rel.replace(/^components\//, '../components/'))
  })

  for (const m of missing) {
    console.log(c('red', `✗ @umbeli-com/${pkg}: ${m.slice(REPO_ROOT.length + 1)} n'est @use nulle part`))
    problems++
  }
  if (!missing.length) {
    console.log(c('green', `✓ @umbeli-com/${pkg}: ${found.length} feuille(s) de style câblée(s)`))
  }
}

if (problems) {
  console.log(c('red', `\n${problems} feuille(s) de style orpheline(s).`))
  console.log(c('dim', "  → ajouter la ligne @use correspondante dans packages/<pkg>/src/styles/index.scss\n"))
  process.exit(1)
}
console.log(c('green', '\n✓ Toutes les feuilles de style sont câblées.\n'))
