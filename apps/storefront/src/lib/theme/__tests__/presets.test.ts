import { describe, expect, it } from 'vitest'

import { COLOR_PRESETS, lightenHex, resolveThemeColors } from '../presets'

describe('theme presets', () => {
    it('resolves known presets before custom config fields', () => {
        expect(resolveThemeColors({
            color_preset: 'ocean',
            primary_color: '#111111',
            secondary_color: '#222222',
            accent_color: '#333333',
        })).toEqual(COLOR_PRESETS.ocean)
    })

    it('uses safe defaults for missing custom fields', () => {
        expect(resolveThemeColors({
            color_preset: 'custom',
            primary_color: '',
            secondary_color: '#222222',
            accent_color: '',
        })).toEqual({
            primary: '#2D5016',
            secondary: '#222222',
            accent: '#FF9800',
            surface: '#FAFDF6',
            text: '#1A2E0A',
        })
    })

    it('lightens hex colors deterministically and clamps at white', () => {
        expect(lightenHex('#000000', 50)).toBe('#808080')
        expect(lightenHex('#fefefe', 100)).toBe('#ffffff')
    })
})
