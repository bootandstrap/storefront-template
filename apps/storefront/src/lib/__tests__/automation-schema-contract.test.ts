import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), '../..')
const MIGRATIONS = join(ROOT, 'supabase/migrations')

function readMigrations(): string {
    return readdirSync(MIGRATIONS)
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => readFileSync(join(MIGRATIONS, file), 'utf8'))
        .join('\n')
}

describe('automation config schema contract', () => {
    it('declares notification channel and event config columns as jsonb', () => {
        const migrations = readMigrations()

        expect(migrations).toContain('notification_channels JSONB')
        expect(migrations).toContain('notification_events JSONB')
        expect(migrations).toContain('COMMENT ON COLUMN public.config.notification_channels')
        expect(migrations).toContain('COMMENT ON COLUMN public.config.notification_events')
    })

    it('allows owner config RPC writes for notification channel and event mappings', () => {
        const migrations = readMigrations()

        expect(migrations).toContain("'notification_channels'")
        expect(migrations).toContain("'notification_events'")
    })
})
