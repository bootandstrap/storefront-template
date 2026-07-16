import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

async function loadCommandModule() {
    return import(pathToFileURL(join(process.cwd(), 'scripts/functional-checkout-cert.mjs')).href)
}

describe('functional checkout certification command', () => {
    it('fails closed when no storefront base URL is configured', async () => {
        const { resolveFunctionalCheckoutCertification } = await loadCommandModule()

        expect(() => resolveFunctionalCheckoutCertification({})).toThrow(/BNS_360_BASE_URL/)
    })

    it('rejects localhost unless local certification is explicitly allowed', async () => {
        const { resolveFunctionalCheckoutCertification } = await loadCommandModule()

        expect(() => resolveFunctionalCheckoutCertification({
            BNS_360_BASE_URL: 'http://localhost:3000',
        })).toThrow(/remote deployed storefront/)
    })

    it('builds a COD simulator Playwright invocation for a deployed storefront', async () => {
        const { resolveFunctionalCheckoutCertification } = await loadCommandModule()

        const command = resolveFunctionalCheckoutCertification({
            BNS_360_BASE_URL: 'https://campifruit.bootandstrap.com',
        })

        expect(command.command).toBe('pnpm')
        expect(command.args).toEqual([
            'test:e2e',
            'e2e/functional-checkout.spec.ts',
            '--project=chromium',
        ])
        expect(command.env).toMatchObject({
            BNS_360_BASE_URL: 'https://campifruit.bootandstrap.com',
            BNS_FUNCTIONAL_CHECKOUT_E2E: '1',
            BNS_CHECKOUT_PAYMENT_MODE: 'cod_simulator',
        })
        expect(command.summary).toContain('https://campifruit.bootandstrap.com')
    })
})
