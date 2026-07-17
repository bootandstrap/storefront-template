import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = join(__dirname, '..', '..', '..', '..', '..')

describe('Template Sync component propagation contract', () => {
    it('syncs reusable product component changes to tenant repositories', () => {
        const workflow = readFileSync(
            join(repoRoot, '.github', 'workflows', 'template-sync.yml'),
            'utf8',
        )

        expect(workflow).toContain("apps/storefront/src/components/products/**")
    })
})
