'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface PanelThemeProviderProps {
    children: React.ReactNode
    /** Server-side default from tenant config (light | dark | system) */
    defaultTheme?: string
}

/**
 * PanelThemeProvider — Isolated dark mode for the Owner Panel.
 *
 * Uses a separate `storageKey` ("panel-theme") so the owner can toggle
 * dark mode in the panel without affecting the storefront's theme.
 * This nests inside the global ThemeProvider and overrides for its subtree.
 *
 * The `attribute="class"` strategy adds/removes the `dark` class,
 * consistent with our globals.css variables.
 */
export function PanelThemeProvider({ children, defaultTheme = 'system' }: PanelThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme={defaultTheme}
            storageKey="panel-theme"
            enableSystem
            disableTransitionOnChange={false}
        >
            {children}
        </NextThemesProvider>
    )
}
