import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { getConfig } from '@/lib/config'
import { resolveThemeColors, lightenHex } from '@/lib/theme/presets'
import { CartProvider } from '@/contexts/CartContext'
import { ToastProvider } from '@/components/ui/Toaster'
import AnalyticsTracker from '@/components/ui/AnalyticsTracker'
import './globals.css'

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

// ---------------------------------------------------------------------------
// Dynamic metadata from config
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getConfig()
  return {
    title: {
      default: config.meta_title || config.business_name,
      template: `%s | ${config.business_name}`,
    },
    description: config.meta_description || `Online store — ${config.business_name}`,
    icons: config.favicon_url ? { icon: config.favicon_url } : undefined,
  }
}

// ---------------------------------------------------------------------------
// Root Layout (Server Component)
// Provides: fonts, CSS theme vars, CartProvider, ToastProvider
// Does NOT include Header/Footer — those live in (shop)/layout.tsx
// ---------------------------------------------------------------------------

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { config, featureFlags } = await getConfig()

  // Resolve theme colors from preset or custom config
  const colors = resolveThemeColors(config)
  const primaryLight = lightenHex(colors.primary, 15)
  const secondaryLight = lightenHex(colors.secondary, 15)
  const accentLight = lightenHex(colors.accent, 15)

  // Resolve theme mode
  const themeMode = config.theme_mode || 'light'
  const htmlClasses = [
    inter.variable,
    outfit.variable,
    themeMode === 'dark' ? 'dark' : '',
  ].filter(Boolean).join(' ')

  return (
    <html
      lang={config.language || 'en'}
      className={htmlClasses}
      data-theme={themeMode}
      style={{
        '--config-primary': colors.primary,
        '--config-primary-light': primaryLight,
        '--config-secondary': colors.secondary,
        '--config-secondary-light': secondaryLight,
        '--config-accent': colors.accent,
        '--config-accent-light': accentLight,
        '--config-surface': colors.surface,
        '--config-text': colors.text,
      } as React.CSSProperties}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <CartProvider>
          <ToastProvider>
            {children}
            <AnalyticsTracker enabled={featureFlags.enable_analytics} />
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  )
}
