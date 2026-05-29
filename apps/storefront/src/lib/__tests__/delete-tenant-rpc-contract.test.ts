import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readMigration(relativePath: string) {
  return readFileSync(resolve(process.cwd(), '..', '..', relativePath), 'utf8')
}

describe('delete_tenant SQL contract', () => {
  const canonicalRpc = readMigration('supabase/migrations/003_rpcs_triggers.sql')
  const hotfixMigration = readMigration('supabase/migrations/20260528_delete_tenant_tenant_medusa_scope_cleanup.sql')

  it('keeps tenant_medusa_scope cleanup in both source-of-truth files', () => {
    expect(canonicalRpc).toContain('tenant_medusa_scope')
    expect(hotfixMigration).toContain('tenant_medusa_scope')
  })

  it('guards optional tenant tables with to_regclass instead of blind deletes', () => {
    expect(canonicalRpc).toContain('to_regclass')
    expect(hotfixMigration).toContain('to_regclass')
    expect(canonicalRpc).not.toContain('DELETE FROM cms_pages WHERE tenant_id = p_tenant_id;')
    expect(hotfixMigration).not.toContain('DELETE FROM cms_pages WHERE tenant_id = p_tenant_id;')
  })
})
