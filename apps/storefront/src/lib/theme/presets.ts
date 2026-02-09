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
}

export const COLOR_PRESETS: Record<string, ThemeColors> = {
    nature: {
        primary: '#2D5016',
        secondary: '#8BC34A',
        accent: '#FF9800',
        surface: '#FAFDF6',
        text: '#1A2E0A',
    },
    ocean: {
        primary: '#0F4C75',
        secondary: '#3282B8',
        accent: '#BBE1FA',
        surface: '#F0F8FF',
        text: '#0B2838',
    },
    sunset: {
        primary: '#C84B31',
        secondary: '#EC7B4A',
        accent: '#FFCC29',
        surface: '#FFF8F0',
        text: '#2D1810',
    },
    berry: {
        primary: '#6B2D5B',
        secondary: '#D183C9',
        accent: '#FF6B9D',
        surface: '#FDF2FA',
        text: '#3D1A35',
    },
    monochrome: {
        primary: '#2D2D2D',
        secondary: '#757575',
        accent: '#BDBDBD',
        surface: '#FAFAFA',
        text: '#1A1A1A',
    },
}

/**
 * Resolve final theme colors based on config.
 * If preset is 'custom', uses the individual color fields from config.
 * Otherwise, returns the matching preset.
 */
export function resolveThemeColors(config: {
    color_preset?: string
    primary_color: string
    secondary_color: string
    accent_color: string
    surface_color?: string | null
    text_color?: string | null
}): ThemeColors {
    const preset = config.color_preset || 'nature'

    if (preset !== 'custom' && COLOR_PRESETS[preset]) {
        return COLOR_PRESETS[preset]
    }

    // Custom: use individual config colors
    return {
        primary: config.primary_color || '#2D5016',
        secondary: config.secondary_color || '#8BC34A',
        accent: config.accent_color || '#FF9800',
        surface: config.surface_color || '#FAFDF6',
        text: config.text_color || '#1A2E0A',
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
