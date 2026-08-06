#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const commands = [
  ['--filter=@bootandstrap/shared', 'exec', 'vitest', 'run', 'src/observability/__tests__/evidence-event.test.ts'],
  [
    '--filter=storefront', 'exec', 'vitest', 'run',
    'src/lib/observability/__tests__/evidence-event.test.ts',
    'src/lib/observability/__tests__/report-error.test.ts',
    'src/lib/observability/__tests__/instrumentation-evidence.test.ts',
    'src/lib/observability/__tests__/cross-plane-chain.test.ts',
    'src/lib/__tests__/logger.test.ts',
  ],
]

for (const args of commands) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
