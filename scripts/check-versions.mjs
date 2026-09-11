#!/usr/bin/env node
/**
 * Refuse un release qui ne publierait rien.
 *
 * publish.yml saute un package dont la version existe déjà sur le registry — ce qui est
 * correct (on ne republie pas une version) mais silencieux. Les cinq packages sont restés
 * en 1.0.0 pendant des dizaines de commits de features : le job passait au vert en
 * ne publiant rien, et les apps ont divergé sans que personne le voie.
 *
 * Ce script rend la panne bruyante : si le `src/` d'un package a bougé depuis le dernier
 * bump de sa version, il faut bumper.
 *
 *   node scripts/check-versions.mjs            # sort en 1 si un bump manque
 *   node scripts/check-versions.mjs --bump minor   # bumpe les packages concernés
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT, PACKAGES, canonicalDir, readJson } from './vendor-map.mjs'

const argv = process.argv.slice(2)
const bumpIdx = argv.indexOf('--bump')
const BUMP = bumpIdx >= 0 ? (argv[bumpIdx + 1] || 'patch') : null

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
const c = (k, s) => `${C[k]}${s}${C.off}`

const git = (...args) => {
  try { return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim() } catch { return '' }
}

/**
 * Référence de comparaison : `origin/main`, c'est-à-dire ce qui a été publié.
 *
 * Comparer au dernier commit qui a bumpé la version marche mal : dans une série
 * de commits pour une même release, tout ce qui suit le commit du bump repasse
 * en « non publié » alors que la version en cours n'est toujours pas en ligne.
 * La vraie question est « le src a-t-il bougé depuis la version que porte
 * origin/main, sans que la version change ? ».
 */
const BASELINE = ['origin/main', 'origin/HEAD', 'main'].find((ref) => git('rev-parse', '--verify', '--quiet', ref))

function publishedVersion(pkg) {
  if (!BASELINE) return null
  const raw = git('show', `${BASELINE}:packages/${pkg}/package.json`)
  if (!raw) return null
  try { return JSON.parse(raw).version } catch { return null }
}

function srcChangedSinceBaseline(pkg) {
  if (!BASELINE) return 0
  return git('diff', '--name-only', BASELINE, 'HEAD', '--', `packages/${pkg}/src`)
    .split('\n').filter(Boolean).length
}

function bumpVersion(v, kind) {
  const [maj, min, pat] = v.split('.').map(Number)
  if (kind === 'major') return `${maj + 1}.0.0`
  if (kind === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

let stale = 0
const report = []

for (const pkg of PACKAGES) {
  const version = readJson(join(canonicalDir(pkg), 'package.json'))?.version ?? '?'
  const published = publishedVersion(pkg)

  // Sans référence distante on ne peut rien affirmer : un checkout superficiel
  // ou un premier push ne doit pas bloquer la publication.
  if (!BASELINE || published === null) { report.push([pkg, version, null, 'aucune référence publiée']); continue }

  const changed = srcChangedSinceBaseline(pkg)
  if (changed && version === published) {
    stale++
    report.push([pkg, version, changed, null])
  } else {
    report.push([pkg, version, 0, changed ? `${version} (publié : ${published})` : null])
  }
}

console.log(c('bold', '\nVersions des packages\n'))
for (const [pkg, version, changed, note] of report) {
  const name = `@umbeli-com/${pkg}`.padEnd(22)
  if (note) console.log(`  ${name} ${version.padEnd(8)} ${c('dim', note)}`)
  else if (changed) console.log(`  ${name} ${version.padEnd(8)} ${c('yellow', `${changed} fichier(s) de src/ modifiés depuis la version publiée — bump manquant`)}`)
  else console.log(`  ${name} ${version.padEnd(8)} ${c('green', 'à jour')}`)
}

if (BUMP) {
  let bumped = 0
  for (const [pkg, version, changed] of report) {
    if (!changed) continue
    const manifestPath = join(canonicalDir(pkg), 'package.json')
    const raw = readFileSync(manifestPath, 'utf8')
    const next = bumpVersion(version, BUMP)
    writeFileSync(manifestPath, raw.replace(/("version"\s*:\s*)"[^"]+"/, `$1"${next}"`))
    console.log(c('green', `\n  ${pkg}: ${version} → ${next}`))
    bumped++
  }
  console.log(bumped ? c('bold', `\n${bumped} package(s) bumpé(s) en ${BUMP}.\n`) : c('dim', '\nRien à bumper.\n'))
  process.exit(0)
}

if (stale) {
  console.log(c('red', `\n✗ ${stale} package(s) ont du code non publié.`))
  console.log(c('dim', '  Le job de publication SAUTE une version déjà publiée : sans bump, le release ne livre rien.'))
  console.log(c('dim', '  → node scripts/check-versions.mjs --bump minor\n'))
  process.exit(1)
}
console.log(c('green', '\n✓ Chaque package publiable reflète son code.\n'))
