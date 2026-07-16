import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '../../../../..')

describe('Medusa system payment provider contract', () => {
    it('uses Medusa payment module built-in system provider for offline checkout', () => {
        const config = readFileSync(join(repoRoot, 'apps/medusa/medusa-config.ts'), 'utf-8')

        expect(config).toContain('resolve: "@medusajs/medusa/payment"')
        expect(config).not.toContain('resolve: "@medusajs/payment/dist/providers/system"')
        expect(config).toContain('pp_system_default')
    })
})
