import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.resolve(process.cwd(), '..', '..')
const POLICY_PATH = path.join(REPO_ROOT, 'scripts/assurance-policy.json')
const VALIDATOR_PATH = path.join(REPO_ROOT, 'scripts/check-assurance-policy.mjs')
const RISK_MATRIX_PATH = path.join(REPO_ROOT, 'scripts/risk-test-matrix.json')

describe('airtight assurance policy', () => {
    it('classifies every eligible storefront source and owns every critical risk domain', () => {
        expect(fs.existsSync(POLICY_PATH), 'missing assurance policy').toBe(true)
        expect(fs.existsSync(VALIDATOR_PATH), 'missing assurance policy validator').toBe(true)
        if (!fs.existsSync(POLICY_PATH) || !fs.existsSync(VALIDATOR_PATH)) return

        const result = JSON.parse(execFileSync(
            process.execPath,
            [VALIDATOR_PATH, '--json'],
            { cwd: REPO_ROOT, encoding: 'utf8' },
        )) as {
            status: string
            sourceUniverse: { eligible: number; classified: number; unclassified: string[] }
            criticalDomains: string[]
        }
        const riskMatrix = JSON.parse(fs.readFileSync(RISK_MATRIX_PATH, 'utf8')) as {
            domains: Array<{ id: string; severity: string }>
        }
        const requiredCriticalDomains = riskMatrix.domains
            .filter((domain) => domain.severity === 'critical')
            .map((domain) => domain.id)
            .sort()

        expect(result.status).toBe('ok')
        expect(result.sourceUniverse.eligible).toBeGreaterThan(175)
        expect(result.sourceUniverse.classified).toBe(result.sourceUniverse.eligible)
        expect(result.sourceUniverse.unclassified).toEqual([])
        expect(result.criticalDomains.sort()).toEqual(requiredCriticalDomains)
    })
})
