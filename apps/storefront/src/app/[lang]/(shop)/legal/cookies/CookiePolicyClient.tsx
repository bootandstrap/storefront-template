'use client'

import { Cookie, Lock, BarChart3, Megaphone, Globe, Settings } from 'lucide-react'
import LegalAccordion from '@/components/legal/LegalAccordion'

interface CookiePolicyClientProps {
    lang: string
    businessName: string
    contactEmail: string
}

type CookieEntry = {
    name: string
    provider: string
    purpose: string
    type: string
    duration: string
}

const COOKIE_INVENTORY: Record<string, CookieEntry[]> = {
    necessary: [
        { name: 'sb-*-auth-token', provider: 'Supabase', purpose: 'auth_session', type: 'HTTP', duration: '7 days' },
        { name: 'bootandstrap_cookie_consent', provider: 'First-party', purpose: 'consent_prefs', type: 'Local Storage', duration: '12 months' },
        { name: 'bootandstrap_cart', provider: 'First-party', purpose: 'cart_data', type: 'Local Storage', duration: 'Session' },
        { name: 'bootandstrap_locale', provider: 'First-party', purpose: 'language', type: 'Local Storage', duration: '12 months' },
        { name: 'NEXT_LOCALE', provider: 'Next.js', purpose: 'locale_routing', type: 'HTTP', duration: 'Session' },
    ],
    analytics: [
        { name: '_ga', provider: 'Google Analytics', purpose: 'ga_distinguish', type: 'HTTP', duration: '2 years' },
        { name: '_ga_*', provider: 'Google Analytics', purpose: 'ga_session', type: 'HTTP', duration: '2 years' },
        { name: '_gid', provider: 'Google Analytics', purpose: 'ga_daily', type: 'HTTP', duration: '24 hours' },
    ],
    marketing: [
        { name: '_fbp', provider: 'Meta Pixel', purpose: 'fb_tracking', type: 'HTTP', duration: '3 months' },
        { name: '_fbc', provider: 'Meta Pixel', purpose: 'fb_click', type: 'HTTP', duration: '3 months' },
    ],
}

const BROWSER_INSTRUCTIONS = [
    { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
    { name: 'Firefox', url: 'https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox' },
    { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471' },
    { name: 'Edge', url: 'https://support.microsoft.com/help/4027947' },
]

export default function CookiePolicyClient({
    lang,
    businessName,
    contactEmail,
}: CookiePolicyClientProps) {
    const isEs = lang === 'es'
    const lastUpdated = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

    const purposeMap: Record<string, string> = isEs
        ? {
            auth_session: 'Mantener sesión de usuario autenticado',
            consent_prefs: 'Almacenar preferencias de cookies',
            cart_data: 'Guardar contenido del carrito de compras',
            language: 'Recordar idioma preferido',
            locale_routing: 'Redirigir al idioma correcto',
            ga_distinguish: 'Distinguir usuarios únicos',
            ga_session: 'Mantener estado de sesión analítica',
            ga_daily: 'Distinguir usuarios (24h)',
            fb_tracking: 'Rastrear visitas desde anuncios de Meta',
            fb_click: 'Rastrear clics desde anuncios de Meta',
        }
        : {
            auth_session: 'Maintain authenticated user session',
            consent_prefs: 'Store cookie preferences',
            cart_data: 'Preserve shopping cart contents',
            language: 'Remember preferred language',
            locale_routing: 'Route to correct locale',
            ga_distinguish: 'Distinguish unique users',
            ga_session: 'Maintain analytics session state',
            ga_daily: 'Distinguish users (24h)',
            fb_tracking: 'Track visits from Meta ads',
            fb_click: 'Track clicks from Meta ads',
        }

    function CookieTable({ cookies }: { cookies: CookieEntry[] }) {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="border-b border-sf-3">
                            <th className="text-left py-2 pr-3 font-semibold text-tx">{isEs ? 'Nombre' : 'Name'}</th>
                            <th className="text-left py-2 pr-3 font-semibold text-tx">{isEs ? 'Proveedor' : 'Provider'}</th>
                            <th className="text-left py-2 pr-3 font-semibold text-tx">{isEs ? 'Propósito' : 'Purpose'}</th>
                            <th className="text-left py-2 pr-3 font-semibold text-tx">{isEs ? 'Tipo' : 'Type'}</th>
                            <th className="text-left py-2 font-semibold text-tx">{isEs ? 'Duración' : 'Duration'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sf-3/50">
                        {cookies.map((c, i) => (
                            <tr key={i}>
                                <td className="py-2 pr-3 font-mono text-tx">{c.name}</td>
                                <td className="py-2 pr-3">{c.provider}</td>
                                <td className="py-2 pr-3">{purposeMap[c.purpose] || c.purpose}</td>
                                <td className="py-2 pr-3">{c.type}</td>
                                <td className="py-2">{c.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    const sections = [
        {
            id: 'what',
            icon: <Cookie className="w-4 h-4" />,
            title: isEs ? '1. ¿Qué son las Cookies?' : '1. What are Cookies?',
            defaultOpen: true,
            content: (
                <p>
                    {isEs
                        ? 'Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo. Se utilizan para recordar preferencias, mantener sesiones activas y analizar el uso del sitio.'
                        : 'Cookies are small text files that websites store on your device. They are used to remember preferences, maintain active sessions, and analyze site usage.'
                    }
                </p>
            ),
        },
        {
            id: 'necessary',
            icon: <Lock className="w-4 h-4" />,
            title: isEs
                ? `2. Cookies Necesarias (${COOKIE_INVENTORY.necessary.length})`
                : `2. Necessary Cookies (${COOKIE_INVENTORY.necessary.length})`,
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Estas cookies son imprescindibles para el funcionamiento básico de la tienda. No pueden desactivarse.'
                            : 'These cookies are essential for basic store operation. They cannot be disabled.'
                        }
                    </p>
                    <CookieTable cookies={COOKIE_INVENTORY.necessary} />
                </div>
            ),
        },
        {
            id: 'analytics',
            icon: <BarChart3 className="w-4 h-4" />,
            title: isEs
                ? `3. Cookies Analíticas (${COOKIE_INVENTORY.analytics.length})`
                : `3. Analytics Cookies (${COOKIE_INVENTORY.analytics.length})`,
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Nos ayudan a entender cómo se utiliza nuestra tienda. Solo se activan con su consentimiento.'
                            : 'These help us understand how our store is used. They are only activated with your consent.'
                        }
                    </p>
                    <CookieTable cookies={COOKIE_INVENTORY.analytics} />
                </div>
            ),
        },
        {
            id: 'marketing',
            icon: <Megaphone className="w-4 h-4" />,
            title: isEs
                ? `4. Cookies de Marketing (${COOKIE_INVENTORY.marketing.length})`
                : `4. Marketing Cookies (${COOKIE_INVENTORY.marketing.length})`,
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Estas cookies se utilizan para mostrar anuncios relevantes. Solo se activan con su consentimiento.'
                            : 'These cookies are used to display relevant ads. They are only activated with your consent.'
                        }
                    </p>
                    <CookieTable cookies={COOKIE_INVENTORY.marketing} />
                </div>
            ),
        },
        {
            id: 'manage',
            icon: <Settings className="w-4 h-4" />,
            title: isEs ? '5. Gestionar Cookies' : '5. Manage Cookies',
            content: (
                <div className="space-y-3">
                    <p>
                        {isEs
                            ? 'Puede cambiar sus preferencias de cookies en cualquier momento usando el enlace "Gestionar cookies" en el pie de página de nuestra web.'
                            : 'You can change your cookie preferences at any time using the "Manage cookies" link in our website footer.'
                        }
                    </p>
                    <p className="text-xs font-semibold text-tx">
                        {isEs ? 'También puede gestionar cookies desde su navegador:' : 'You can also manage cookies from your browser:'}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {BROWSER_INSTRUCTIONS.map(b => (
                            <a
                                key={b.name}
                                href={b.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass rounded-lg p-3 flex items-center gap-2 hover:bg-sf-2/50 transition-colors group"
                            >
                                <Globe className="w-4 h-4 text-brand shrink-0" />
                                <span className="text-xs text-tx group-hover:text-brand transition-colors">{b.name}</span>
                                <span className="text-[10px] text-tx-faint ml-auto">→</span>
                            </a>
                        ))}
                    </div>
                </div>
            ),
        },
    ]

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-subtle mb-4">
                    <Cookie className="w-7 h-7 text-brand" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-3">
                    {isEs ? 'Política de Cookies' : 'Cookie Policy'}
                </h1>
                <p className="text-tx-muted">
                    {isEs ? `Cómo ${businessName || 'nuestra tienda'} utiliza cookies y tecnologías similares.` : `How ${businessName || 'our store'} uses cookies and similar technologies.`}
                </p>
                <p className="text-xs text-tx-faint mt-2">
                    {isEs ? 'Última actualización' : 'Last updated'}: {lastUpdated}
                </p>
            </div>

            <LegalAccordion items={sections} allowMultiple />

            {/* Contact */}
            {contactEmail && (
                <div className="mt-8 text-center text-xs text-tx-muted">
                    {isEs ? 'Para consultas sobre cookies' : 'For cookie inquiries'}: {' '}
                    <a href={`mailto:${contactEmail}`} className="text-brand hover:underline">{contactEmail}</a>
                </div>
            )}
        </div>
    )
}
