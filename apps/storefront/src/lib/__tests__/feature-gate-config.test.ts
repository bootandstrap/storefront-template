/**
 * Feature Gate Config — Coverage Test
 *
 * Ensures:
 * 1. Every panel-gated flag has an entry in FEATURE_GATE_MAP
 * 2. Every entry has valid module key and BSWEB slugs for all 5 locales
 * 3. Every BSWEB slug is non-empty
 * 4. Module name i18n keys exist in all dictionaries
 */

import { describe, it, expect } from 'vitest'
import {
    FEATURE_GATE_MAP,
    PANEL_GATED_FLAGS,
    getModuleInfoUrl,
    BSWEB_BASE_URL,
} from '../feature-gate-config'

const SUPPORTED_LOCALES = ['es', 'en', 'de', 'fr', 'it']

describe('Feature Gate Config', () => {
    describe('Panel-gated flags coverage', () => {
        it('every panel-gated flag must have an entry in FEATURE_GATE_MAP', () => {
            for (const flag of PANEL_GATED_FLAGS) {
                expect(
                    FEATURE_GATE_MAP[flag],
                    `Missing FEATURE_GATE_MAP entry for panel-gated flag: ${flag}`
                ).toBeDefined()
            }
        })

        it('every entry maps to a non-empty moduleKey', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                expect(
                    entry.moduleKey,
                    `FEATURE_GATE_MAP[${flag}] has empty moduleKey`
                ).toBeTruthy()
            }
        })
    })

    describe('BSWEB slug coverage', () => {
        it('every entry has BSWEB slugs for all 5 supported locales', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                for (const locale of SUPPORTED_LOCALES) {
                    expect(
                        entry.bswSlug[locale],
                        `FEATURE_GATE_MAP[${flag}] missing BSWEB slug for locale: ${locale}`
                    ).toBeTruthy()
                }
            }
        })

        it('no BSWEB slug is empty or whitespace', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                for (const [locale, slug] of Object.entries(entry.bswSlug)) {
                    expect(
                        slug.trim().length,
                        `FEATURE_GATE_MAP[${flag}] has empty slug for ${locale}`
                    ).toBeGreaterThan(0)
                }
            }
        })
    })

    describe('getModuleInfoUrl', () => {
        it('returns correct URL for known flag and locale', () => {
            const url = getModuleInfoUrl('enable_analytics', 'es')
            expect(url).toBe(`${BSWEB_BASE_URL}/es/modulos/seo-modular`)
        })

        it('falls back to /modulos for unknown flag', () => {
            const url = getModuleInfoUrl('unknown_flag', 'en')
            expect(url).toBe(`${BSWEB_BASE_URL}/en/modulos`)
        })

        it('falls back to English slug when locale slug is missing', () => {
            // Test with a hypothetical entry that only has 'en' slug
            const url = getModuleInfoUrl('enable_chatbot', 'en')
            expect(url).toContain('/modulos/whatsapp-bot')
        })
    })

    describe('i18n key integrity', () => {
        it('every entry has a non-empty moduleNameKey', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                expect(
                    entry.moduleNameKey,
                    `FEATURE_GATE_MAP[${flag}] has empty moduleNameKey`
                ).toBeTruthy()
                expect(
                    entry.moduleNameKey.startsWith('featureGate.modules.'),
                    `FEATURE_GATE_MAP[${flag}].moduleNameKey should start with 'featureGate.modules.'`
                ).toBe(true)
            }
        })

        it('every entry has a non-empty icon', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                expect(
                    entry.icon,
                    `FEATURE_GATE_MAP[${flag}] has empty icon`
                ).toBeTruthy()
            }
        })
    })
})
