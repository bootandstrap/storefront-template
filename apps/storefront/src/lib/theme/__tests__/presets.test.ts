import { describe, expect, it } from 'vitest'

import { COLOR_PRESETS, contrastRatio, lightenHex, resolveThemeColors } from '../presets'

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
            textSecondary: '#4A5E3A',
            textMuted: '#5F704F',
            textInverse: '#FFFFFF',
        })
    })

    it('keeps custom tenant runtime colors accessible on light surfaces', () => {
        const colors = resolveThemeColors({
            color_preset: 'custom',
            primary_color: '#6CAD81',
            secondary_color: '#8BC34A',
            accent_color: '#FF9800',
            surface_color: '#FFFFFF',
            text_color: '#B9BFB4',
        })

        expect(contrastRatio(colors.primary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(colors.text, colors.surface)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(colors.textSecondary, colors.surface)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(colors.textMuted, colors.surface)).toBeGreaterThanOrEqual(4.5)
    })

    it('lightens hex colors deterministically and clamps at white', () => {
        expect(lightenHex('#000000', 50)).toBe('#808080')
        expect(lightenHex('#fefefe', 100)).toBe('#ffffff')
    })
})
