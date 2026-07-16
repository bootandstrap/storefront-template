import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const srcRoot = join(__dirname, '..', '..')

function read(path: string) {
    return readFileSync(join(srcRoot, path), 'utf-8')
}

describe('CSP inline nonce contract', () => {
    it('passes the request CSP nonce into next-themes storefront and panel scripts', () => {
        const shopLayout = read('app/[lang]/(shop)/layout.tsx')
        const panelLayout = read('app/[lang]/(panel)/layout.tsx')
        const themeProvider = read('components/theme/ThemeProvider.tsx')
        const panelThemeProvider = read('components/theme/PanelThemeProvider.tsx')

        expect(themeProvider).toContain('nonce?: string')
        expect(themeProvider).toContain('nonce={nonce}')
        expect(panelThemeProvider).toContain('nonce?: string')
        expect(panelThemeProvider).toContain('nonce={nonce}')
        expect(shopLayout).toContain("headersList.get('x-csp-nonce')")
        expect(shopLayout).toContain('<ThemeProvider defaultTheme={config.theme_mode || \'light\'} nonce={cspNonce}>')
        expect(panelLayout).toContain("headersList.get('x-csp-nonce')")
        expect(panelLayout).toContain('<PanelThemeProvider nonce={cspNonce}>')
    })

    it('adds the CSP nonce to public JSON-LD scripts', () => {
        for (const path of [
            'app/[lang]/(shop)/page.tsx',
            'app/[lang]/(shop)/productos/[handle]/page.tsx',
            'app/[lang]/(shop)/faq/page.tsx',
        ]) {
            const source = read(path)

            expect(source).toContain("headersList.get('x-csp-nonce')")
            expect(source).toContain('nonce={cspNonce}')
        }
    })
})
