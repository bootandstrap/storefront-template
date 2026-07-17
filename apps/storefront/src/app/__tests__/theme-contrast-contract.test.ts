import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const globals = readFileSync(
    join(__dirname, '..', 'globals.css'),
    'utf-8',
)

function contrastRatio(hexA: string, hexB: string): number {
    const luminance = (hex: string) => {
        const channels = hex
            .replace('#', '')
            .match(/.{2}/g)
            ?.map((part) => {
                const value = parseInt(part, 16) / 255
                return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
            })

        if (!channels) throw new Error(`Invalid color ${hex}`)
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }

    const [light, dark] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a)
    return (light + 0.05) / (dark + 0.05)
}

describe('theme contrast contract', () => {
    it('keeps muted text contrast above WCAG AA on the light storefront surface', () => {
        const muted = globals.match(/--color-tx-muted:\s*(#[0-9a-fA-F]{6});/)?.[1]
        const surface = globals.match(/--color-sf-0:\s*(#[0-9a-fA-F]{6});/)?.[1]

        expect(muted).toBeDefined()
        expect(surface).toBeDefined()
        expect(contrastRatio(muted!, surface!)).toBeGreaterThanOrEqual(4.5)
    })
})
