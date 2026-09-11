/**
 * Découverte de la topologie de vendoring de la suite Umbelium.
 *
 * Les apps ne consomment PAS ce repo via le registry : chacune embarque une copie
 * du package (`file:vendor/umbeli-components/<pkg>`). Ce module retrouve toutes ces
 * copies au lieu de les lister en dur — une nouvelle app est prise en compte sans
 * toucher au script.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SUITE_ROOT = resolve(REPO_ROOT, '..')
export const PACKAGES = ['ui', 'auth', 'layout', 'billing', 'e2e']

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.claude', '.next', 'coverage',
  'playwright-report', 'test-results', 'dist-server', '.pnpm-store', 'engine-wasm',
])

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function walk(dir, out, depth = 0) {
  if (depth > 6) return out
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (!e.isDirectory()) {
      if (e.name === 'package.json') out.push(join(dir, e.name))
      continue
    }
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue
    walk(join(dir, e.name), out, depth + 1)
  }
  return out
}

/**
 * Copies réellement consommées par une app.
 *
 * Deux façons d'être référencé :
 *  - un `file:` déclaré par un manifeste d'APP (les `file:../ui` que les copies se
 *    déclarent entre elles ne comptent pas : deux orphelines qui se tiennent la main
 *    resteraient invisibles) ;
 *  - être membre du pnpm workspace d'une app (Noesium consomme en `workspace:^`).
 */
function collectReferenced(manifests) {
  const referenced = new Set()

  for (const manifest of manifests) {
    const pkg = readJson(manifest)
    if (!pkg) continue
    if (pkg.name?.startsWith('@umbeli-com/')) continue // lien intra-vendor
    for (const field of ['dependencies', 'devDependencies']) {
      for (const [name, spec] of Object.entries(pkg[field] || {})) {
        if (!name.startsWith('@umbeli-com/') || typeof spec !== 'string') continue
        if (spec.startsWith('file:')) referenced.add(resolve(dirname(manifest), spec.slice(5)))
      }
    }
  }

  for (const wsFile of walkWorkspaces()) {
    const appRoot = dirname(wsFile)
    for (const glob of readWorkspaceGlobs(wsFile)) {
      const base = join(appRoot, glob.replace(/\/\*+$/, ''))
      let entries
      try { entries = readdirSync(base, { withFileTypes: true }) } catch { continue }
      for (const e of entries) if (e.isDirectory()) referenced.add(join(base, e.name))
    }
  }

  return referenced
}

function walkWorkspaces() {
  const found = []
  const visit = (dir, depth = 0) => {
    if (depth > 3) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isFile() && e.name === 'pnpm-workspace.yaml') found.push(join(dir, e.name))
      else if (e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) visit(join(dir, e.name), depth + 1)
    }
  }
  visit(SUITE_ROOT)
  return found.filter((f) => dirname(f) !== REPO_ROOT)
}

function readWorkspaceGlobs(wsFile) {
  try {
    return readFileSync(wsFile, 'utf8')
      .split('\n')
      .map((l) => l.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/))
      .filter(Boolean)
      .map((m) => m[1].trim())
      .filter((g) => g && !g.startsWith('!'))
  } catch { return [] }
}

/**
 * @returns {{name:string, pkg:string, dir:string, rel:string, app:string,
 *            kind:'src'|'dist', orphan:boolean, version:string}[]}
 */
export function discoverTargets() {
  const manifests = walk(SUITE_ROOT, [])
  const referenced = collectReferenced(manifests)
  const targets = []

  for (const manifest of manifests) {
    const dir = dirname(manifest)
    if (dir.startsWith(join(REPO_ROOT, 'packages'))) continue // la source canonique
    const pkg = readJson(manifest)
    if (!pkg?.name?.startsWith('@umbeli-com/')) continue
    const short = pkg.name.slice('@umbeli-com/'.length)
    if (!PACKAGES.includes(short)) continue

    const rel = relative(SUITE_ROOT, dir)
    targets.push({
      name: pkg.name,
      pkg: short,
      dir,
      rel,
      app: rel.split('/')[0],
      // Noesium fork le SRC en workspace pnpm ; les autres embarquent le dist bâti.
      kind: existsSync(join(dir, 'src')) ? 'src' : 'dist',
      orphan: !referenced.has(dir),
      version: pkg.version || '0.0.0',
    })
  }

  return targets.sort((a, b) => a.rel.localeCompare(b.rel))
}

export function canonicalDir(pkg) {
  return join(REPO_ROOT, 'packages', pkg)
}

export function canonicalVersion(pkg) {
  return readJson(join(canonicalDir(pkg), 'package.json'))?.version ?? '0.0.0'
}

export { readJson, statSync }
