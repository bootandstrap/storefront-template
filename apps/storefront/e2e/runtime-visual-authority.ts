import type { Page } from '@playwright/test'

export function getAuthoritativeProductPrimaryCta(page: Page) {
    return page.locator('#main-content').getByTestId('product-primary-cta')
}
