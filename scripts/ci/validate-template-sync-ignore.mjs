#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const AUTHORIZED_ENTRIES = [
  'apps/storefront/src/app/globals.css',
  'apps/storefront/src/components/home/',
  'apps/storefront/src/components/layout/Header.tsx',
  'apps/storefront/src/components/layout/Footer.tsx',
  'apps/storefront/src/lib/i18n/dictionaries/',
  'apps/storefront/public/',
  ':(literal)apps/storefront/src/app/[lang]/(shop)/page.tsx',
  '.env',
  '.env.local',
  '.env.production',
  '.templatesyncignore',
].sort()

function fail(message) {
  console.error(`[template-sync-ignore] ${message}`)
  process.exit(1)
}

const policyArg = process.argv[2]
if (!policyArg) {
  fail('policy file is required')
}

const policyPath = resolve(policyArg)

try {
  if (!statSync(policyPath).isFile()) {
    fail('policy file is required')
  }
} catch {
  fail('policy file is required')
}

const entries = readFileSync(policyPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, '').trim())
  .filter(Boolean)
  .sort()

if (
  entries.length !== AUTHORIZED_ENTRIES.length
  || entries.some((entry, index) => entry !== AUTHORIZED_ENTRIES[index])
) {
  fail('target policy must match the authorized customize policy')
}

process.stdout.write('[template-sync-ignore] policy valid\n')
