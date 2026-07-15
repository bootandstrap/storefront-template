import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), '../..')
const MIGRATIONS = join(ROOT, 'supabase/migrations')
const DEPRECATED_MIGRATIONS = join(MIGRATIONS, '_DEPRECATED')
const DEPRECATED_AUTOMATION_MIGRATION = '20260711_automation_notification_config.sql'

function readActiveMigrations(): string {
    return readdirSync(MIGRATIONS)
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => readFileSync(join(MIGRATIONS, file), 'utf8'))
        .join('\n')
}

function readDeprecatedAutomationMigration(): string {
    return readFileSync(join(DEPRECATED_MIGRATIONS, DEPRECATED_AUTOMATION_MIGRATION), 'utf8')
}

describe('automation config schema contract', () => {
    it('archives notification config DDL under the control-plane ownership boundary', () => {
        const activeMigrations = readActiveMigrations()
        const deprecatedMigration = readDeprecatedAutomationMigration()
        const deprecatedReadme = readFileSync(join(DEPRECATED_MIGRATIONS, 'README.md'), 'utf8')
        const schemaDocs = readFileSync(join(ROOT, 'docs/SCHEMA.md'), 'utf8')

        expect(activeMigrations).not.toContain('notification_channels JSONB')
        expect(activeMigrations).not.toContain('notification_events JSONB')
        expect(deprecatedMigration).toContain('notification_channels JSONB')
        expect(deprecatedMigration).toContain('notification_events JSONB')
        expect(deprecatedReadme).toContain(DEPRECATED_AUTOMATION_MIGRATION)
        expect(schemaDocs).toContain('BOOTANDSTRAP_WEB/supabase/migrations')
        expect(schemaDocs).toContain('20260715_automation_notification_config.sql')
    })

    it('keeps archived owner config RPC allowlist for notification channel and event mappings', () => {
        const deprecatedMigration = readDeprecatedAutomationMigration()

        expect(deprecatedMigration).toContain("'notification_channels'")
        expect(deprecatedMigration).toContain("'notification_events'")
    })
})
