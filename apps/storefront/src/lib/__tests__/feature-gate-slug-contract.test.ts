import { describe, expect, it } from 'vitest'
import { FEATURE_GATE_MAP } from '../feature-gate-config'

const EXPECTED_FEATURE_GATE_SLUGS: Record<string, string[]> = {
    es: [
        'tienda-online',
        'seo-modular',
        'chatbot-ia',
        'canales-de-venta',
        'multi-idioma',
        'auth-avanzada',
        'crm',
        'email-marketing',
    ],
    en: [
        'ecommerce',
        'seo',
        'ai-chatbot',
        'sales-channels',
        'multilingual',
        'advanced-auth',
        'crm',
        'email-marketing',
    ],
    de: [
        'onlineshop',
        'seo',
        'ki-chatbot',
        'vertriebskanaele',
        'mehrsprachig',
        'erweiterte-auth',
        'crm',
        'email-marketing',
    ],
    fr: [
        'boutique-en-ligne',
        'seo',
        'chatbot-ia',
        'canaux-de-vente',
        'multilingue',
        'auth-avancee',
        'crm',
        'email-marketing',
    ],
    it: [
        'negozio-online',
        'seo',
        'chatbot-ia',
        'canali-di-vendita',
        'multilingua',
        'auth-avanzata',
        'crm',
        'email-marketing',
    ],
}

describe('feature-gate slug contract', () => {
    it('contains the expected storefront slugs per locale', () => {
        const slugsByLocale: Record<string, Set<string>> = {
            es: new Set<string>(),
            en: new Set<string>(),
            de: new Set<string>(),
            fr: new Set<string>(),
            it: new Set<string>(),
        }

        for (const entry of Object.values(FEATURE_GATE_MAP)) {
            for (const [locale, slug] of Object.entries(entry.bswSlug)) {
                slugsByLocale[locale]?.add(slug)
            }
        }

        for (const [locale, expectedSlugs] of Object.entries(EXPECTED_FEATURE_GATE_SLUGS)) {
            for (const expectedSlug of expectedSlugs) {
                expect(
                    slugsByLocale[locale]?.has(expectedSlug),
                    `Expected slug "${expectedSlug}" not found for locale "${locale}" in FEATURE_GATE_MAP`
                ).toBe(true)
            }
        }
    })
})
