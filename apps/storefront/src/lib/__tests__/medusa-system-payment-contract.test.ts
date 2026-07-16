import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '../../../../..')

describe('Medusa system payment provider contract', () => {
    it('registers the system payment provider used by offline checkout', () => {
        const config = readFileSync(join(repoRoot, 'apps/medusa/medusa-config.ts'), 'utf-8')

        expect(config).toContain('resolve: "@medusajs/medusa/payment"')
        expect(config).toContain('resolve: "@medusajs/payment/dist/providers/system"')
        expect(config).toContain('id: "default"')
        expect(config).toContain('pp_system_default')
    })
})
