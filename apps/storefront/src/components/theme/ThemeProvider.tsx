'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface ThemeProviderProps {
    children: React.ReactNode
    /** Server-side default from tenant config (light | dark | system) */
    defaultTheme?: string
}

/**
 * Theme provider for dark mode support.
 * Uses `next-themes` for flicker-free SSR + localStorage persistence.
 * 
 * The `class` strategy adds/removes the `dark` class on <html>,
 * which is what our CSS variables in globals.css respond to.
 */
export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme={defaultTheme}
            enableSystem
            disableTransitionOnChange={false}
        >
            {children}
        </NextThemesProvider>
    )
}
