import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '../..')

const storefrontPageSurfaces = [
    'apps/storefront/src/app/[lang]/(shop)/paginas/[slug]/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx',
    'apps/storefront/src/app/[lang]/css-test/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/about/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/cuenta/buscar-pedido/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/faq/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/legal/[slug]/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/legal/aviso/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/productos/[handle]/page.tsx',
    'apps/storefront/src/app/[lang]/(panel)/panel/email/dominio/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/comparar/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/cuenta/favoritos/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/legal/cookies/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/legal/privacidad/page.tsx',
    'apps/storefront/src/app/[lang]/(shop)/legal/terminos/page.tsx',
] as const

function readPage(sourcePath: string) {
    return fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8')
}

describe('storefront page surface contract', () => {
    it.each(storefrontPageSurfaces)('%s exists as a real Next page', (sourcePath) => {
        const source = readPage(sourcePath)

        expect(source).toContain('export default')
        expect(source).toContain('return')
        if (source.includes('dangerouslySetInnerHTML')) {
            expect(source).toMatch(/safeJsonLd|escapeHtml/)
        }
    })

    it.each(storefrontPageSurfaces)('%s does not expose server secrets or live payment mutations', (sourcePath) => {
        const source = readPage(sourcePath)

        expect(source).not.toMatch(/process\.env\.[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD)/i)
        expect(source).not.toMatch(/stripe\.(paymentIntents|refunds|charges|tax\.registrations)\.create/i)
        expect(source).not.toMatch(/console\.(log|info|warn|error)\([^)]*process\.env/i)
    })

    it('keeps dynamic customer/order pages wired to runtime data and guarded states', () => {
        const cmsPage = readPage('apps/storefront/src/app/[lang]/(shop)/paginas/[slug]/page.tsx')
        const orderPage = readPage('apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx')
        const productPage = readPage('apps/storefront/src/app/[lang]/(shop)/productos/[handle]/page.tsx')

        expect(cmsPage).toMatch(/notFound|published|cms_pages/)
        expect(orderPage).toMatch(/checkout|cart|order/i)
        expect(productPage).toMatch(/notFound|handle|product/i)
    })
})
