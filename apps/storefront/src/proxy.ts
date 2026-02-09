import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, per-IP sliding window)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_API = 60           // 60 requests/min for API
const RATE_LIMIT_PAGE = 200         // 200 requests/min for pages

// Clean up stale entries every 60s
setInterval(() => {
    const now = Date.now()
    for (const [key, val] of rateLimitMap) {
        if (now > val.resetAt) rateLimitMap.delete(key)
    }
}, 60_000)

function isRateLimited(ip: string, isApi: boolean): boolean {
    const limit = isApi ? RATE_LIMIT_API : RATE_LIMIT_PAGE
    const key = `${ip}:${isApi ? 'api' : 'page'}`
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
        return false
    }

    entry.count++
    return entry.count > limit
}

// ---------------------------------------------------------------------------
// Supported locales (must match SUPPORTED_LOCALES in lib/i18n)
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = ['en', 'es', 'de', 'fr', 'it']
const LOCALE_PATTERN = /^\/([a-z]{2})(\/|$)/

// ---------------------------------------------------------------------------
// Localized route slug → canonical slug mapping
// Used to rewrite incoming localized URLs to file-system canonical paths
// Canonical slugs are the Spanish ones (file-system structure)
// ---------------------------------------------------------------------------

const SLUG_MAPS: Record<string, Record<string, string>> = {
    en: {
        products: 'productos',
        account: 'cuenta',
        orders: 'pedidos',
        profile: 'perfil',
        addresses: 'direcciones',
        cart: 'carrito',
        register: 'registro',
        order: 'pedido',
    },
    de: {
        produkte: 'productos',
        konto: 'cuenta',
        bestellungen: 'pedidos',
        profil: 'perfil',
        adressen: 'direcciones',
        warenkorb: 'carrito',
        registrieren: 'registro',
        anmelden: 'login',
        bestellung: 'pedido',
    },
    fr: {
        produits: 'productos',
        compte: 'cuenta',
        commandes: 'pedidos',
        profil: 'perfil',
        adresses: 'direcciones',
        panier: 'carrito',
        connexion: 'login',
        inscription: 'registro',
        commande: 'pedido',
    },
    it: {
        prodotti: 'productos',
        // account → cuenta (Italian uses "account" same as English)
        account: 'cuenta',
        ordini: 'pedidos',
        profilo: 'perfil',
        indirizzi: 'direcciones',
        carrello: 'carrito',
        accesso: 'login',
        registrazione: 'registro',
        pannello: 'panel',
        ordine: 'pedido',
    },
    // Spanish is canonical — no rewrites needed
    es: {},
}

/**
 * Rewrite a localized URL path to canonical file-system path.
 * Example: /en/account/orders → /en/cuenta/pedidos
 */
function rewriteLocalizedPath(path: string, lang: string): string | null {
    const slugMap = SLUG_MAPS[lang]
    if (!slugMap || Object.keys(slugMap).length === 0) return null

    // Split path: /en/account/orders → ['', 'en', 'account', 'orders']
    const parts = path.split('/')
    let changed = false

    for (let i = 2; i < parts.length; i++) {
        const canonical = slugMap[parts[i]]
        if (canonical) {
            parts[i] = canonical
            changed = true
        }
    }

    return changed ? parts.join('/') : null
}

// ---------------------------------------------------------------------------
// Route classification (locale-aware)
// Routes are now /{lang}/... so we strip the lang prefix for classification
// ---------------------------------------------------------------------------

const PUBLIC_SEGMENTS = ['', 'productos', 'login', 'registro', 'pedido']
const PUBLIC_PREFIXES = ['productos/', 'auth/', 'api/', 'cms/', 'paginas/']
const PROTECTED_SEGMENTS_PREFIX = ['cuenta/']
const OWNER_SEGMENTS_PREFIX = ['panel/']

function classifyRoute(pathAfterLang: string): 'public' | 'protected' | 'owner' | 'conditional' {
    if (PUBLIC_SEGMENTS.includes(pathAfterLang)) return 'public'
    for (const p of PUBLIC_PREFIXES) {
        if (pathAfterLang.startsWith(p)) return 'public'
    }
    for (const p of PROTECTED_SEGMENTS_PREFIX) {
        if (pathAfterLang.startsWith(p)) return 'protected'
    }
    for (const p of OWNER_SEGMENTS_PREFIX) {
        if (pathAfterLang.startsWith(p)) return 'owner'
    }
    return 'conditional'
}

// ---------------------------------------------------------------------------
// Proxy handler — rate limiting + locale rewriting + session refresh + protection
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request })
    const path = request.nextUrl.pathname

    // Skip static files / Next internals
    if (
        path.startsWith('/_next') ||
        path.startsWith('/favicon') ||
        path.includes('.')
    ) {
        return response
    }

    // ── Rate limiting ──────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || '127.0.0.1'
    const isApi = path.startsWith('/api/')

    if (isRateLimited(ip, isApi)) {
        return NextResponse.json(
            { error: 'Too many requests' },
            {
                status: 429,
                headers: { 'Retry-After': '60' },
            }
        )
    }

    // ── Exempt health + webhook from auth ──────
    if (path === '/api/health' || path === '/api/webhooks/stripe') {
        return response
    }

    // ── Locale detection & slug rewriting ──────
    const localeMatch = path.match(LOCALE_PATTERN)
    const lang = localeMatch?.[1]

    if (lang && SUPPORTED_LOCALES.includes(lang)) {
        // Rewrite localized slugs to canonical paths
        const rewritten = rewriteLocalizedPath(path, lang)
        if (rewritten) {
            const url = request.nextUrl.clone()
            url.pathname = rewritten
            return NextResponse.rewrite(url)
        }
    }

    // Create Supabase client with cookie forwarding
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options as never)
                    })
                },
            },
        }
    )

    // Refresh session — use getUser() (Next.js 16 pattern)
    const { data: { user } } = await supabase.auth.getUser()

    // ── Route classification ──────────────────
    // Strip /{lang}/ prefix for classification
    let pathAfterLang = path
    if (lang) {
        pathAfterLang = path.substring(lang.length + 2) // Remove /xx/
        if (pathAfterLang.startsWith('/')) pathAfterLang = pathAfterLang.substring(1)
    }

    const routeType = classifyRoute(pathAfterLang)

    if (routeType === 'public') {
        return response
    }

    if (routeType === 'protected') {
        if (!user) {
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = lang ? `/${lang}/login` : '/login'
            loginUrl.searchParams.set('redirect', path)
            return NextResponse.redirect(loginUrl)
        }
        return response
    }

    if (routeType === 'owner') {
        if (!user) {
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = lang ? `/${lang}/login` : '/login'
            loginUrl.searchParams.set('redirect', path)
            return NextResponse.redirect(loginUrl)
        }

        // Check role — must be owner or super_admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        if (role !== 'owner' && role !== 'super_admin') {
            const accountUrl = request.nextUrl.clone()
            accountUrl.pathname = lang ? `/${lang}/cuenta` : '/cuenta'
            return NextResponse.redirect(accountUrl)
        }
        return response
    }

    // Conditional routes (/carrito, /checkout) — allow all
    // The checkout page itself checks the require_auth_to_order flag server-side
    return response
}
