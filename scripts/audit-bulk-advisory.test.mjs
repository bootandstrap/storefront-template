import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
    buildAuditReceipt,
    extractAdvisoryId,
    filterAdvisoriesBySeverity,
    parsePnpmLockPackages,
    validateWaivers,
} from './audit-bulk-advisory.mjs'

describe('audit bulk advisory helper', () => {
    it('parses package names and versions from a pnpm v9 lockfile package section', () => {
        const packages = parsePnpmLockPackages(`
lockfileVersion: '9.0'

importers:
  .: {}

packages:

  '@scope/pkg@1.2.3(peer@1.0.0)':
    resolution: {}

  plain-package@4.5.6:
    resolution: {}

  '@scope/another@0.1.0':
    resolution: {}

snapshots:
`)

        assert.deepEqual(packages, {
            '@scope/pkg': ['1.2.3'],
            'plain-package': ['4.5.6'],
            '@scope/another': ['0.1.0'],
        })
    })

    it('filters advisories at or above the requested severity and extracts GHSA ids', () => {
        const advisories = filterAdvisoriesBySeverity({
            minimatch: [
                {
                    url: 'https://github.com/advisories/GHSA-3ppc-4f35-3m26',
                    severity: 'high',
                    title: 'high advisory',
                },
                {
                    url: 'https://github.com/advisories/GHSA-low0-low0-low0',
                    severity: 'low',
                    title: 'low advisory',
                },
            ],
        }, 'moderate')

        assert.deepEqual(advisories.map((advisory) => advisory.id), ['GHSA-3ppc-4f35-3m26'])
        assert.equal(extractAdvisoryId('https://github.com/advisories/GHSA-abcd-1234-wxyz'), 'GHSA-abcd-1234-wxyz')
    })

    it('requires active non-expired waivers for every advisory', () => {
        const result = validateWaivers([
            { id: 'GHSA-3ppc-4f35-3m26', packageName: 'minimatch', severity: 'high', title: 'waived' },
            { id: 'GHSA-exp1-exp1-exp1', packageName: 'rollup', severity: 'high', title: 'expired' },
            { id: 'GHSA-meta-meta-meta', packageName: 'router', severity: 'moderate', title: 'incomplete metadata' },
            { id: 'GHSA-miss-miss-miss', packageName: 'multer', severity: 'high', title: 'missing' },
        ], `
## Active Acceptances

### GHSA-3ppc-4f35-3m26
| **Review By** | 2026-12-31 |
| **Owner** | Platform team |
| **Justification** | Upstream has no compatible patched release. |

### GHSA-exp1-exp1-exp1
| **Review By** | 2026-01-01 |
| **Owner** | Platform team |
| **Justification** | Historical acceptance awaiting upstream. |

### GHSA-meta-meta-meta
| **Review By** | 2026-12-31 |

### Neighboring-complete-section
| **Owner** | Must not be borrowed |
| **Justification** | Must not be borrowed from the next section. |
`, '2026-07-15')

        assert.equal(result.valid, false)
        assert.deepEqual(result.accepted.map((item) => item.id), ['GHSA-3ppc-4f35-3m26'])
        assert.deepEqual(result.expired.map((item) => item.id), ['GHSA-exp1-exp1-exp1'])
        assert.deepEqual(result.invalid.map((item) => ({ id: item.id, reasons: item.reasons })), [
            { id: 'GHSA-meta-meta-meta', reasons: ['owner', 'justification'] },
        ])
        assert.deepEqual(result.missing.map((item) => item.id), ['GHSA-miss-miss-miss'])
    })

    it('builds a fail-closed structured receipt with severity and waiver counts', () => {
        const advisories = [
            { id: 'GHSA-high-high-high', packageName: 'high-package', severity: 'high', title: 'high' },
            { id: 'GHSA-modr-modr-modr', packageName: 'moderate-package', severity: 'moderate', title: 'moderate' },
        ]
        const waiverResult = {
            valid: false,
            accepted: [{ ...advisories[1], reviewBy: '2026-12-31', owner: 'Platform', justification: 'Bounded' }],
            expired: [],
            invalid: [],
            missing: [advisories[0]],
        }

        assert.deepEqual(buildAuditReceipt({
            packageCount: 42,
            auditLevel: 'moderate',
            advisories,
            waiverResult,
            generatedAt: '2026-08-12T17:00:00.000Z',
        }), {
            schema: 'bootandstrap.supply-chain-audit/v1',
            status: 'failed',
            auditLevel: 'moderate',
            packageCount: 42,
            counts: {
                advisories: 2,
                high: 1,
                critical: 0,
                acceptedWaivers: 1,
                expiredWaivers: 0,
                invalidWaivers: 0,
                missingWaivers: 1,
                unwaivedHighCritical: 1,
            },
            acceptedWaivers: [{
                id: 'GHSA-modr-modr-modr',
                severity: 'moderate',
                reviewBy: '2026-12-31',
                owner: 'Platform',
                justification: 'Bounded',
            }],
            residuals: ['missing_waiver:GHSA-high-high-high'],
            generatedAt: '2026-08-12T17:00:00.000Z',
        })
    })

    it('binds the audit producer, waiver register and structured output into the assurance task', () => {
        const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
        const definitions = JSON.parse(readFileSync(resolve(root, 'scripts/assurance-tasks.json'), 'utf8'))
        const task = definitions.tasks.find(candidate => candidate.id === 'audit-policy')
        const wrapper = readFileSync(resolve(root, 'scripts/check-audit-waiver.sh'), 'utf8')

        assert.deepEqual(task.command, ['bash', 'scripts/check-audit-waiver.sh'])
        assert.deepEqual(task.outputs, ['.artifacts/assurance/dependency-audit.json'])
        assert.ok(task.inputs.includes('scripts/audit-bulk-advisory.mjs'))
        assert.ok(task.inputs.includes('docs/operations/DEPENDENCY_RISK_REGISTER.md'))
        assert.match(wrapper, /--output "\$ROOT_DIR\/\.artifacts\/assurance\/dependency-audit\.json"/)
    })
})
