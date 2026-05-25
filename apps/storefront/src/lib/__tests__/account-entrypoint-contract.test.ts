import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relativePath: string) {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('account entrypoint tenant-context contract', () => {
    it('cuenta layout resolves tenant context with profile tenant scope before redirecting panel roles', () => {
        const source = read('src/app/[lang]/(shop)/cuenta/layout.tsx')

        expect(source).toContain(".select('role, tenant_id')")
        expect(source).toContain('profileTenantId: profile?.tenant_id ?? null')
        expect(source).toContain('resolveTenantContext({')
    })
})
