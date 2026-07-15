import { describe, expect, it } from 'vitest'

import {
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

        expect(packages).toEqual({
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

        expect(advisories.map((advisory) => advisory.id)).toEqual(['GHSA-3ppc-4f35-3m26'])
        expect(extractAdvisoryId('https://github.com/advisories/GHSA-abcd-1234-wxyz')).toBe('GHSA-abcd-1234-wxyz')
    })

    it('requires active non-expired waivers for every advisory', () => {
        const result = validateWaivers([
            { id: 'GHSA-3ppc-4f35-3m26', packageName: 'minimatch', severity: 'high', title: 'waived' },
            { id: 'GHSA-exp1-exp1-exp1', packageName: 'rollup', severity: 'high', title: 'expired' },
            { id: 'GHSA-miss-miss-miss', packageName: 'multer', severity: 'high', title: 'missing' },
        ], `
## Active Acceptances

### GHSA-3ppc-4f35-3m26
| **Review By** | 2026-12-31 |

### GHSA-exp1-exp1-exp1
| **Review By** | 2026-01-01 |
`, '2026-07-15')

        expect(result.valid).toBe(false)
        expect(result.accepted.map((item) => item.id)).toEqual(['GHSA-3ppc-4f35-3m26'])
        expect(result.expired.map((item) => item.id)).toEqual(['GHSA-exp1-exp1-exp1'])
        expect(result.missing.map((item) => item.id)).toEqual(['GHSA-miss-miss-miss'])
    })
})
