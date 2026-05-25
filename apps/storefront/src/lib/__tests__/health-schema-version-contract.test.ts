import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relativePath: string) {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('health schema version contract', () => {
    it('tenant health probes import and expose the synced schema version artifact', () => {
        const health = read('src/app/api/health/route.ts')
        const readiness = read('src/app/api/health/ready/route.ts')
        const liveness = read('src/app/api/health/live/route.ts')
        const governanceHealth = read('src/app/api/v1/governance/health/route.ts')

        for (const source of [health, readiness, liveness, governanceHealth]) {
            expect(source).toContain("SCHEMA_VERSION")
            expect(source).toContain("schemaVersion")
        }
    })
})
