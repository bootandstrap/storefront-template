import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relativePath: string) {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('chat route tenant-context contract', () => {
    it('chat owner routes resolve panel access with role plus tenant scope instead of role-only checks', () => {
        const settingsRoute = read('src/app/api/chat/settings/route.ts')
        const statsRoute = read('src/app/api/chat/stats/route.ts')
        const helper = read('src/lib/chat/panel-access.ts')

        for (const source of [settingsRoute, statsRoute]) {
            expect(source).toContain('getChatPanelContext')
        }

        expect(helper).toContain("resolveTenantContext")
        expect(helper).toContain(".select('role, tenant_id')")
        expect(helper).toContain('profileTenantId: profile?.tenant_id ?? null')
    })
})
