#!/usr/bin/env node
// @ts-check
// CLI: umbeli-acceptance [path/to/acceptance.yaml] [--allow-blocked]
// Défaut du chemin: e2e/acceptance.yaml (relatif au cwd).
import { reportAcceptance } from './acceptance.js';

const args = process.argv.slice(2);
const allowBlocked = args.includes('--allow-blocked');
const path = args.find((a) => !a.startsWith('--')) ?? 'e2e/acceptance.yaml';

process.exit(reportAcceptance(path, { allowBlocked }));
