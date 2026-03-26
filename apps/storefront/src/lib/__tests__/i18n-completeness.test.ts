/**
 * i18n Dictionary Completeness Tests
 *
 * Validates that all 5 locales (en, es, de, fr, it) exist and have
 * matching structure. Reports missing keys per locale.
 *
 * v0.1 Release Gate — must pass before professional development begins.
 *
 * NOTE: es.json is the primary locale (Spanish storefront), so it is tested
 * strictly against en.json. Other locales (de, fr, it) are tested for
 * structural existence but missing keys are non-blocking in v0.1.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const DICT_DIR = join(__dirname, '..', 'i18n', 'dictionaries')
const LOCALES = ['en', 'es', 'de', 'fr', 'it']

function loadDict(locale: string): Record<string, unknown> {
    const filePath = join(DICT_DIR, `${locale}.json`)
    if (!existsSync(filePath)) return {}
    return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = []
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
        } else {
            keys.push(fullKey)
        }
    }
    return keys.sort()
}

const dicts = Object.fromEntries(LOCALES.map(l => [l, loadDict(l)]))
const enKeys = flattenKeys(dicts['en'])

describe('i18n Dictionary Completeness', () => {
    it('baseline (en) dictionary exists and has keys', () => {
        expect(enKeys.length).toBeGreaterThan(50)
    })

    for (const locale of LOCALES) {
        it(`${locale}.json file exists`, () => {
            expect(existsSync(join(DICT_DIR, `${locale}.json`))).toBe(true)
        })
    }

    // ── Top-level key consistency ──

    it('es.json contains all top-level sections from en.json', () => {
        const enTopKeys = Object.keys(dicts['en']).sort()
        const esTopKeys = Object.keys(dicts['es']).sort()
        const missing = enTopKeys.filter(k => !esTopKeys.includes(k))
        expect(
            missing,
            `es.json is missing top-level sections: ${missing.join(', ')}`
        ).toHaveLength(0)
    })

    // ── Deep key consistency (es is strictly tested, others are warnings) ──

    it('es.json has all keys that en.json has', () => {
        const esKeys = flattenKeys(dicts['es'])
        const missing = enKeys.filter(k => !esKeys.includes(k))
        expect(
            missing,
            `es.json is missing ${missing.length} keys vs en.json: ${missing.slice(0, 10).join(', ')}`
        ).toHaveLength(0)
    })

    // Other locales: report coverage percentage (non-blocking for v0.1)
    for (const locale of ['de', 'fr', 'it']) {
        it(`${locale}.json has ≥90% key coverage vs en.json`, () => {
            const localeKeys = flattenKeys(dicts[locale])
            const coverage = localeKeys.length / enKeys.length
            expect(
                coverage,
                `${locale}.json has ${(coverage * 100).toFixed(1)}% coverage (${localeKeys.length}/${enKeys.length} keys)`
            ).toBeGreaterThanOrEqual(0.90)
        })
    }

    // ── No empty string values ──

    for (const locale of LOCALES) {
        it(`${locale}.json has no empty string values`, () => {
            const allKeys = flattenKeys(dicts[locale])
            const emptyKeys: string[] = []
            for (const key of allKeys) {
                const parts = key.split('.')
                let value: unknown = dicts[locale]
                for (const part of parts) {
                    value = (value as Record<string, unknown>)?.[part]
                }
                if (value === '') {
                    emptyKeys.push(key)
                }
            }
            expect(
                emptyKeys,
                `${locale}.json has empty values: ${emptyKeys.slice(0, 5).join(', ')}`
            ).toHaveLength(0)
        })
    }
})
