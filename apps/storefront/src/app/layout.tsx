import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { headers } from 'next/headers'
import { getConfig } from '@/lib/config'
import { isValidLocale } from '@/lib/i18n'
import { resolveThemeColors, lightenHex } from '@/lib/theme/presets'
import { createClient } from '@/lib/supabase/server'
import { RuntimeEnvScript } from '@/lib/runtime-env'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { CompareProvider } from '@/contexts/CompareContext'
import { ToastProvider } from '@/components/ui/Toaster'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import AnalyticsTracker from '@/components/ui/AnalyticsTracker'
import ServiceWorkerRegister from '@/components/ui/ServiceWorkerRegister'
import NextTopLoader from 'nextjs-toploader'
import { initOpenFeature } from '@/lib/openfeature'
import './globals.css'

// Initialize OpenFeature SDK with BootandStrap governance provider.
// Must happen at module level so it's ready before any component renders.
initOpenFeature()

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: {
      default: config.meta_title || config.business_name,
      template: `%s | ${config.business_name}`,
    },
    description: config.meta_description || `Online store — ${config.business_name}`,
    keywords: ['ecommerce', config.business_name, 'online store', 'shopping'],
    authors: [{ name: config.business_name }],
    icons: config.favicon_url ? { icon: config.favicon_url } : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: siteUrl ? {
      canonical: siteUrl,
      languages: {
        'es': `${siteUrl}/es`,
        'en': `${siteUrl}/en`,
        'x-default': `${siteUrl}/es`,
      },
    } : undefined,
  }
}

export async function generateViewport(): Promise<any> {
    const { config } = await getConfig()
    const colors = resolveThemeColors(config)
    return {
        themeColor: colors.primary,
        width: 'device-width',
        initialScale: 1,
        maximumScale: 5,
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

  // Auth check for wishlist sync
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  // Dynamically resolve locale from URL path (/{lang}/...)
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') || headersList.get('x-matched-path') || ''
  const firstSegment = pathname.split('/').filter(Boolean)[0] || ''
  const htmlLang = isValidLocale(firstSegment) ? firstSegment : (config.language || 'en')

  // Resolve theme colors from preset or custom config
  const colors = resolveThemeColors(config)
  const primaryLight = lightenHex(colors.primary, 15)
  const secondaryLight = lightenHex(colors.secondary, 15)
  const accentLight = lightenHex(colors.accent, 15)

  // Resolve theme mode — default from config, client can override via next-themes
  const themeMode = config.theme_mode || 'light'
  const htmlClasses = [
    inter.variable,
    outfit.variable,
  ].filter(Boolean).join(' ')

  return (
    <html
      lang={htmlLang}
      className={htmlClasses}
      suppressHydrationWarning
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
      <head>
        {/* Preconnects — reduce DNS+TLS for critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {config.logo_url && (
          <link rel="preconnect" href={new URL(config.logo_url).origin} crossOrigin="anonymous" />
        )}
        {/* Preconnect to Medusa backend — reduces LCP by cutting DNS+TLS time */}
        {process.env.MEDUSA_BACKEND_URL && (
          <link rel="preconnect" href={process.env.MEDUSA_BACKEND_URL} />
        )}
        {/* eslint-disable-next-line @next/next/google-font-preconnect -- preconnect already above */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* PWA */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <NextTopLoader
          color="var(--color-brand)"
          height={2}
          showSpinner={false}
          shadow={false}
        />
        <RuntimeEnvScript />
        <CartProvider>
            <WishlistProvider isAuthenticated={isAuthenticated}>
                <CompareProvider>
                <ToastProvider>
                    {children}
                    <AnalyticsTracker enabled={featureFlags.enable_analytics} />
                    <ServiceWorkerRegister />
                </ToastProvider>
                </CompareProvider>
            </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  )
}
