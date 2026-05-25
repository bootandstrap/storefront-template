import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relativePath: string) {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('billing portal tenant-context contract', () => {
    it('resolves owner access using tenant context instead of raw role-only checks', () => {
        const source = read('src/app/api/billing-portal/route.ts')

        expect(source).toContain('resolveTenantContext')
        expect(source).toContain('profileTenantId: profile?.tenant_id ?? null')
        expect(source).toContain('metadataRole: user.user_metadata?.role ?? null')
    })
})
