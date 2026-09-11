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

/** Dernier commit qui a changé le champ `version` du package. */
function lastVersionBump(pkg) {
  const manifest = `packages/${pkg}/package.json`
  const shas = git('log', '--format=%H', '--', manifest).split('\n').filter(Boolean)
  for (const sha of shas) {
    const diff = git('show', '--format=', '-U0', sha, '--', manifest)
    if (/^[+-]\s*"version"\s*:/m.test(diff)) return sha
  }
  return shas[shas.length - 1] || ''
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
  const manifestPath = join(canonicalDir(pkg), 'package.json')
  const version = readJson(manifestPath)?.version ?? '?'
  const since = lastVersionBump(pkg)

  // Sans historique on ne peut rien affirmer — on ne bloque pas un checkout superficiel.
  if (!since) { report.push([pkg, version, null, 'historique git absent']); continue }

  const changed = git('log', '--format=%h', `${since}..HEAD`, '--', `packages/${pkg}/src`)
    .split('\n').filter(Boolean)

  if (changed.length) {
    stale++
    report.push([pkg, version, changed.length, null])
  } else {
    report.push([pkg, version, 0, null])
  }
}

console.log(c('bold', '\nVersions des packages\n'))
for (const [pkg, version, changed, note] of report) {
  const name = `@umbeli-com/${pkg}`.padEnd(22)
  if (note) console.log(`  ${name} ${version.padEnd(8)} ${c('dim', note)}`)
  else if (changed) console.log(`  ${name} ${version.padEnd(8)} ${c('yellow', `${changed} commit(s) sur src/ depuis le dernier bump`)}`)
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
