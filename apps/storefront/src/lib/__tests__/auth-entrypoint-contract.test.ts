import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relativePath: string) {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('auth entrypoint tenant-context contract', () => {
    it('loginAction passes tenant context fields to resolvePostLoginDestination', () => {
        const source = read('src/app/[lang]/(auth)/login/actions.ts')

        expect(source).toContain('profileTenantId')
        expect(source).toContain('metadataRole')
        expect(source).toContain('profileRole:')
        expect(source).toContain('resolvePostLoginDestination({')
    })

    it('auth callback passes tenant context fields to resolvePostLoginDestination', () => {
        const source = read('src/app/[lang]/(auth)/auth/callback/route.ts')

        expect(source).toContain('profileTenantId')
        expect(source).toContain('metadataRole')
        expect(source).toContain('profileRole:')
        expect(source).toContain('resolvePostLoginDestination({')
    })
})
