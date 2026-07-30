/**
 * Color presets for the template theme system.
 * Admin Panel selects which preset to use via `config.color_preset`.
 * When preset = 'custom', the storefront uses config.primary_color, etc.
 */

export interface ThemeColors {
    primary: string
    secondary: string
    accent: string
    surface: string
    text: string
    textSecondary: string
    textMuted: string
    textInverse: string
}

export const COLOR_PRESETS: Record<string, ThemeColors> = {
    nature: {
        primary: '#2D5016',
        secondary: '#8BC34A',
        accent: '#FF9800',
        surface: '#FAFDF6',
        text: '#1A2E0A',
        textSecondary: '#4A5E3A',
        textMuted: '#5F704F',
        textInverse: '#FFFFFF',
    },
    ocean: {
        primary: '#0F4C75',
        secondary: '#3282B8',
        accent: '#BBE1FA',
        surface: '#F0F8FF',
        text: '#0B2838',
        textSecondary: '#315265',
        textMuted: '#536D7D',
        textInverse: '#FFFFFF',
    },
    sunset: {
        primary: '#C84B31',
        secondary: '#EC7B4A',
        accent: '#FFCC29',
        surface: '#FFF8F0',
        text: '#2D1810',
        textSecondary: '#614035',
        textMuted: '#75584F',
        textInverse: '#FFFFFF',
    },
    berry: {
        primary: '#6B2D5B',
        secondary: '#D183C9',
        accent: '#FF6B9D',
        surface: '#FDF2FA',
        text: '#3D1A35',
        textSecondary: '#68415E',
        textMuted: '#7B5C73',
        textInverse: '#FFFFFF',
    },
    monochrome: {
        primary: '#2D2D2D',
        secondary: '#757575',
        accent: '#BDBDBD',
        surface: '#FAFAFA',
        text: '#1A1A1A',
        textSecondary: '#4B5563',
        textMuted: '#5F6673',
        textInverse: '#FFFFFF',
    },
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function normalizeHex(value: string | null | undefined, fallback: string): string {
    if (value && HEX_PATTERN.test(value)) return value.toUpperCase()
    return fallback
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = normalizeHex(hex, '#000000').replace('#', '')
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
    const toHex = (value: number) => Math.round(Math.max(0, Math.min(255, value)))
        .toString(16)
        .padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex)
    const channel = (value: number) => {
        const normalized = value / 255
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4
    }

    return channel(r) * 0.2126 + channel(g) * 0.7152 + channel(b) * 0.0722
}

export function contrastRatio(hexA: string, hexB: string): number {
    const [light, dark] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a)
    return (light + 0.05) / (dark + 0.05)
}

function mixHex(hex: string, target: string, amount: number): string {
    const sourceRgb = hexToRgb(hex)
    const targetRgb = hexToRgb(target)
    return rgbToHex({
        r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount,
        g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount,
        b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount,
    })
}

function ensureContrast(foreground: string, background: string, minimum = 4.5): string {
    const normalizedForeground = normalizeHex(foreground, '#111827')
    const normalizedBackground = normalizeHex(background, '#FFFFFF')
    if (contrastRatio(normalizedForeground, normalizedBackground) >= minimum) return normalizedForeground

    const target = relativeLuminance(normalizedBackground) > 0.5 ? '#000000' : '#FFFFFF'
    for (let step = 1; step <= 10; step += 1) {
        const candidate = mixHex(normalizedForeground, target, step / 10)
        if (contrastRatio(candidate, normalizedBackground) >= minimum) return candidate
    }

    return target
}

/**
 * Resolve final theme colors based on config.
 * If preset is 'custom', uses the individual color fields from config.
 * Otherwise, returns the matching preset.
 */
export function resolveThemeColors(config: {
    color_preset?: string
    primary_color: string | null
    secondary_color: string | null
    accent_color: string | null
    surface_color?: string | null
    text_color?: string | null
}): ThemeColors {
    const preset = config.color_preset || 'nature'

    if (preset !== 'custom' && COLOR_PRESETS[preset]) {
        return COLOR_PRESETS[preset]
    }

    // Custom: use individual config colors, but never ship unreadable runtime
    // tokens. Owner-selected colors are preserved when they pass contrast.
    const surface = normalizeHex(config.surface_color, '#FAFDF6')
    const primary = ensureContrast(normalizeHex(config.primary_color, '#2D5016'), '#FFFFFF')
    const text = ensureContrast(normalizeHex(config.text_color, '#1A2E0A'), surface)
    const surfaceIsLight = relativeLuminance(surface) > 0.5

    return {
        primary,
        secondary: normalizeHex(config.secondary_color, '#8BC34A'),
        accent: normalizeHex(config.accent_color, '#FF9800'),
        surface,
        text,
        textSecondary: ensureContrast(surfaceIsLight ? '#4A5E3A' : '#C5D8B8', surface),
        textMuted: ensureContrast(surfaceIsLight ? '#5F704F' : '#A3B89A', surface),
        textInverse: contrastRatio('#FFFFFF', primary) >= 4.5 ? '#FFFFFF' : '#111827',
    }
}

/**
 * Lighten a hex color by a given percentage (0-100).
 * Used to generate primary-light from primary for gradients.
 */
export function lightenHex(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, (num >> 16) + Math.round(((255 - (num >> 16)) * percent) / 100))
    const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(((255 - ((num >> 8) & 0x00ff)) * percent) / 100))
    const b = Math.min(255, (num & 0x0000ff) + Math.round(((255 - (num & 0x0000ff)) * percent) / 100))
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
