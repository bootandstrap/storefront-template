import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relativePath: string) {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('supabase types sync contract', () => {
    it('storefront database types expose starter owner fields synced from the canonical schema', () => {
        const source = read('src/lib/supabase/database.types.ts')

        expect(source).toContain('owner_experience_mode')
        expect(source).toContain('starter_blueprints')
        expect(source).toContain('starter_projects')
        expect(source).toContain('starter_project_phases')
        expect(source).toContain('starter_project_requests')
    })

    it('documents BSWEB as canonical owner for shared Supabase generated types', () => {
        const source = read('../../docs/SCHEMA.md')

        expect(source).toContain('BOOTANDSTRAP_WEB')
        expect(source).toContain('database.types.ts')
        expect(source).toContain('sync-supabase-types.mjs')
    })

    it('ships the sync script and CI workflow for Supabase generated types', () => {
        const script = read('../../scripts/sync-supabase-types.mjs')
        const workflow = read('../../.github/workflows/sync-supabase-types.yml')
        const rootPackage = JSON.parse(read('../../package.json')) as {
            scripts: Record<string, string>
        }
        const schemaVersion = read('src/lib/supabase/schema-version.ts')

        expect(script).toContain('apps/storefront/src/lib/supabase/database.types.ts')
        expect(script).toContain('apps/storefront/src/lib/supabase/schema-version.ts')
        expect(script).toContain('supabase/migrations')
        expect(script).toContain('src/types/supabase.ts')
        expect(workflow).toContain('scripts/sync-supabase-types.mjs')
        expect(workflow).toContain('database.types.ts')
        expect(workflow).toContain('schema-version.ts')
        expect(rootPackage.scripts['sync:supabase-types']).toBe(
            'node scripts/sync-supabase-types.mjs'
        )
        expect(rootPackage.scripts['check:supabase-types']).toBe(
            'node scripts/sync-supabase-types.mjs --check'
        )
        expect(schemaVersion).toContain('SCHEMA_VERSION')
    })
})
