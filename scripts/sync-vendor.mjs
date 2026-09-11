#!/usr/bin/env node
/**
 * Synchronise les packages canoniques vers les 41 copies vendorisées de la suite.
 *
 *   pnpm sync            # build + pousse partout
 *   pnpm sync:check      # ne touche à rien, sort en 1 si une copie a dérivé
 *   pnpm sync -- --package ui --app Webum --dry-run
 *
 * Pourquoi ce script : chaque app embarque sa copie pour que `docker build` n'ait
 * pas besoin d'un token GitHub Packages. Tant que la recopie était manuelle
 * (le rsync décrit dans le README), les copies dérivaient — d'où `--check`, à
 * brancher en CI pour que la dérive devienne une erreur au lieu d'une surprise.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { discoverTargets, canonicalDir, PACKAGES, REPO_ROOT, SUITE_ROOT, readJson } from './vendor-map.mjs'

const argv = process.argv.slice(2)
const has = (flag) => argv.includes(flag)
const opt = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null }

const CHECK = has('--check')
const DRY = has('--dry-run')
const NO_BUILD = has('--no-build') || CHECK
const ONLY_PKG = opt('--package')
const ONLY_APP = opt('--app')

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
const c = (color, s) => `${C[color]}${s}${C.off}`

/** Répertoires réellement recopiés, par type de copie. */
const SYNCED_DIRS = { dist: ['dist'], src: ['src', 'dist'] }
/** Champs du package.json qui appartiennent à la source canonique. */
const OWNED_FIELDS = ['version', 'description', 'type', 'main', 'module', 'types', 'exports', 'files', 'peerDependencies']

function run(cmd, args, cwd = REPO_ROOT) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/**
 * rsync en mode --itemize-changes : la même commande sert à comparer et à écrire.
 *
 * `--checksum` est obligatoire ici : sans lui rsync compare taille+mtime, et un
 * simple rebuild suffirait à faire passer les 39 copies pour dérivées.
 * On ne garde ensuite que les lignes d'un vrai changement de contenu — transfert
 * (`<`/`>`), création (`c`) ou suppression (`*deleting`) — car même à contenu
 * identique rsync signale l'alignement des mtimes (`.f..t....`).
 */
function rsync(from, to, write) {
  const args = ['-a', '--checksum', '--delete', '--itemize-changes',
                '--exclude', 'node_modules', '--exclude', '.DS_Store']
  if (!write) args.push('--dry-run')
  args.push(from.endsWith('/') ? from : from + '/', to.endsWith('/') ? to : to + '/')
  return run('rsync', args)
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => /^[<>c*]/.test(l))
}

/**
 * Le manifeste de la copie est un hybride : la FORME du package vient du canon
 * (c'est elle qui casse quand on ajoute un sous-chemin d'export), les
 * DÉPENDANCES restent celles de la copie.
 *
 * Ne pas toucher aux dépendances est délibéré : une copie vendorisée en déclare
 * volontairement moins que le canon — react, lucide-react et consorts sont
 * fournis par l'app hôte au moment du bundling. Et recopier une dep interne
 * telle quelle installerait `"@umbeli-com/ui": "workspace:^"` dans un contexte
 * `file:` sans workspace, ce qui casse net l'install de l'app.
 */
function mergeManifest(canonPkg, targetPkg) {
  const merged = { ...targetPkg }
  for (const field of OWNED_FIELDS) {
    if (canonPkg[field] === undefined) delete merged[field]
    else merged[field] = canonPkg[field]
  }
  return merged
}

const targets = discoverTargets().filter(
  (t) => (!ONLY_PKG || t.pkg === ONLY_PKG) && (!ONLY_APP || t.app === ONLY_APP)
)

if (!targets.length) {
  console.error(c('red', 'Aucune copie ne correspond aux filtres.'))
  process.exit(1)
}

if (!NO_BUILD) {
  const pkgs = ONLY_PKG ? [ONLY_PKG] : PACKAGES
  console.log(c('bold', `▸ Build ${pkgs.join(', ')}`))
  for (const p of pkgs) {
    const canon = readJson(join(canonicalDir(p), 'package.json'))
    if (!canon?.scripts?.build) { console.log(c('dim', `  ${p}: pas de build (source livrée telle quelle)`)); continue }
    run('pnpm', ['--filter', `@umbeli-com/${p}`, 'build'])
    console.log(c('green', `  ${p} ✓`))
  }
  console.log()
}

let drifted = 0
let synced = 0
const orphans = []
const byApp = new Map()
for (const t of targets) {
  if (!byApp.has(t.app)) byApp.set(t.app, [])
  byApp.get(t.app).push(t)
}

for (const [app, appTargets] of byApp) {
  const lines = []
  for (const t of appTargets) {
    if (t.orphan) { orphans.push(t); continue }

    const canonPkgPath = join(canonicalDir(t.pkg), 'package.json')
    const canonPkg = readJson(canonPkgPath)
    const changes = []

    for (const dir of SYNCED_DIRS[t.kind]) {
      const from = join(canonicalDir(t.pkg), dir)
      const to = join(t.dir, dir)
      // Une copie `dist` n'a pas de src/ ; une copie src n'a pas forcément de dist bâti.
      if (!existsSync(from)) continue
      if (dir !== SYNCED_DIRS[t.kind][0] && !existsSync(to)) continue
      const items = rsync(from, to, !CHECK && !DRY)
      if (items.length) changes.push(`${dir}/ ${items.length} fichier(s)`)
    }

    const styles = join(canonicalDir(t.pkg), 'styles.d.ts')
    if (existsSync(styles) && existsSync(join(t.dir, 'styles.d.ts'))) {
      if (readFileSync(styles, 'utf8') !== readFileSync(join(t.dir, 'styles.d.ts'), 'utf8')) {
        changes.push('styles.d.ts')
        if (!CHECK && !DRY) writeFileSync(join(t.dir, 'styles.d.ts'), readFileSync(styles, 'utf8'))
      }
    }

    const targetPkgPath = join(t.dir, 'package.json')
    const targetPkg = readJson(targetPkgPath)
    if (canonPkg && targetPkg) {
      const merged = mergeManifest(canonPkg, targetPkg)
      const before = JSON.stringify(targetPkg)
      const after = JSON.stringify(merged)
      if (before !== after) {
        changes.push('package.json')
        if (!CHECK && !DRY) writeFileSync(targetPkgPath, JSON.stringify(merged, null, 2) + '\n')
      }
    }

    if (changes.length) {
      drifted++
      lines.push(`    ${c('yellow', t.pkg.padEnd(8))} ${changes.join(', ')}`)
    } else {
      synced++
    }
  }
  if (lines.length) {
    console.log(c('bold', `  ${app}`))
    console.log(lines.join('\n'))
  }
}

console.log()
if (orphans.length) {
  console.log(c('yellow', `⚠ ${orphans.length} copie(s) orpheline(s) — plus référencée(s) par aucun package.json, non synchronisée(s) :`))
  for (const o of orphans) console.log(c('dim', `    ${o.rel}`))
  console.log(c('dim', '    → à supprimer du repo de l\'app.'))
  console.log()
}

const scope = [ONLY_PKG && `package=${ONLY_PKG}`, ONLY_APP && `app=${ONLY_APP}`].filter(Boolean).join(' ')
console.log(c('bold', `${targets.length - orphans.length} copie(s) examinée(s)${scope ? ' (' + scope + ')' : ''} : ${synced} à jour, ${drifted} ${CHECK || DRY ? 'en dérive' : 'mise(s) à jour'}.`))

if (CHECK && drifted) {
  console.log(c('red', '\n✗ Des copies vendorisées ont dérivé de la source canonique.'))
  console.log(c('dim', '  Lancer `pnpm sync` dans UmbeliumComponents, puis committer chaque repo d\'app touché.'))
  process.exit(1)
}
if (!CHECK && !DRY && drifted) {
  console.log(c('dim', `\n→ Committer les repos d'app touchés (${SUITE_ROOT}/<App>).`))
}
