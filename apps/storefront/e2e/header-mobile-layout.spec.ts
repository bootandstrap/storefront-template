import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { getAuthoritativeProductPrimaryCta } from './runtime-visual-authority'

const headerStyles = readFileSync(
    resolve(process.cwd(), 'src/components/layout/Header.module.css'),
    'utf8'
)

const fixtureStyles = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; }
    .shell { width: 100%; padding: 0 16px; }
    .row { display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .brand { display: flex; align-items: center; gap: 8px; color: #111; text-decoration: none; }
    .businessName { font: 700 20px/28px system-ui, sans-serif; }
    .actions { display: flex; flex: none; align-items: center; gap: 8px; }
    .action { display: block; flex: none; width: 36px; height: 36px; border: 0; padding: 0; }
    .account { width: 48px; }
`

async function renderHeaderFixture(page: Page, businessName: string) {
    await page.setContent(`
        <style>${fixtureStyles}\n${headerStyles}</style>
        <header class="shell">
            <div class="row">
                <a class="brand" href="/">
                    <span class="businessName">${businessName}</span>
                </a>
                <div class="actions" aria-label="Store actions">
                    <button class="action" aria-label="Search"></button>
                    <button class="action" aria-label="Cart"></button>
                    <a class="action account" aria-label="Account"></a>
                    <button class="action" aria-label="Menu"></button>
                </div>
            </div>
        </header>
    `)
}

test.describe('responsive storefront header', () => {
    test('keeps the canary tenant name inside a 390px viewport without losing its accessible text', async ({ page }) => {
        const businessName = 'Ops Live 202608111914'
        await page.setViewportSize({ width: 390, height: 844 })
        await renderHeaderFixture(page, businessName)

        const layout = await page.evaluate(() => {
            const businessNameElement = document.querySelector<HTMLElement>('.businessName')!
            const actionsElement = document.querySelector<HTMLElement>('.actions')!

            return {
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                businessNameClientWidth: businessNameElement.clientWidth,
                businessNameScrollWidth: businessNameElement.scrollWidth,
                actionsRight: actionsElement.getBoundingClientRect().right,
            }
        })
        const brand = page.locator('.businessName')

        await expect(brand).toHaveText(businessName)
        expect(layout.businessNameScrollWidth).toBeGreaterThan(layout.businessNameClientWidth)
        expect(layout.actionsRight).toBeLessThanOrEqual(layout.clientWidth)
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
    })
})

test.describe('runtime visual authority', () => {
    test('selects the PDP CTA owned by main content when another rendered CTA shares its test id', async ({ page }) => {
        await page.setContent(`
            <main id="main-content">
                <div data-testid="product-primary-cta">Authoritative PDP CTA</div>
            </main>
            <aside aria-label="Detached product surface">
                <div data-testid="product-primary-cta">Detached duplicate CTA</div>
            </aside>
        `)

        const primaryCta = getAuthoritativeProductPrimaryCta(page)

        await expect(primaryCta).toHaveCount(1)
        await expect(primaryCta).toHaveText('Authoritative PDP CTA')
    })
})
