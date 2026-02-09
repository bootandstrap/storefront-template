import { describe, it, expect } from 'vitest'
import { createTranslator, isValidLocale, SUPPORTED_LOCALES, CANONICAL_ROUTES, getLocalizedSlug, localizedHref, buildReverseSlugMap } from '../index'
import type { Dictionary } from '../index'

describe('createTranslator', () => {
    const dict: Dictionary = {
        'nav.home': 'Home',
        'nav.products': 'Products',
        'account.welcomeMessage': 'Hello, {{name}}! 👋',
        'order.quantity': 'Qty: {{qty}} × {{price}}',
        'profile.memberSince': 'Member since {{date}}',
    }
    const t = createTranslator(dict)

    it('returns value for existing key', () => {
        expect(t('nav.home')).toBe('Home')
        expect(t('nav.products')).toBe('Products')
    })

    it('returns the key itself for missing key', () => {
        expect(t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('interpolates single replacement', () => {
        expect(t('account.welcomeMessage', { name: 'Juan' })).toBe('Hello, Juan! 👋')
    })

    it('interpolates multiple replacements', () => {
        expect(t('order.quantity', { qty: '3', price: '€5' })).toBe('Qty: 3 × €5')
    })

    it('handles missing replacement gracefully (leaves placeholder)', () => {
        expect(t('profile.memberSince', {})).toBe('Member since {{date}}')
    })

    it('handles empty dictionary', () => {
        const emptyT = createTranslator({})
        expect(emptyT('nav.home')).toBe('nav.home')
    })
})

describe('isValidLocale', () => {
    it('accepts supported locales', () => {
        expect(isValidLocale('en')).toBe(true)
        expect(isValidLocale('es')).toBe(true)
        expect(isValidLocale('de')).toBe(true)
        expect(isValidLocale('fr')).toBe(true)
        expect(isValidLocale('it')).toBe(true)
    })

    it('rejects unsupported locales', () => {
        expect(isValidLocale('pt')).toBe(false)
        expect(isValidLocale('zh')).toBe(false)
        expect(isValidLocale('')).toBe(false)
        expect(isValidLocale('EN')).toBe(false) // case sensitive
    })
})

describe('SUPPORTED_LOCALES', () => {
    it('contains exactly 5 locales', () => {
        expect(SUPPORTED_LOCALES).toHaveLength(5)
    })

    it('includes en and es', () => {
        expect(SUPPORTED_LOCALES).toContain('en')
        expect(SUPPORTED_LOCALES).toContain('es')
    })
})

describe('getLocalizedSlug', () => {
    it('returns localized slug from dictionary', () => {
        const dict: Dictionary = { 'routes.products': 'produkte' }
        expect(getLocalizedSlug('products', dict)).toBe('produkte')
    })

    it('falls back to canonical slug when key missing', () => {
        const dict: Dictionary = {}
        expect(getLocalizedSlug('products', dict)).toBe('productos')
    })
})

describe('localizedHref', () => {
    it('builds correct localized URL', () => {
        const dict: Dictionary = { 'routes.products': 'products' }
        // filter(Boolean) removes the leading '' so no leading slash
        expect(localizedHref('en', 'products', dict)).toBe('en/products')
    })

    it('appends rest segments', () => {
        const dict: Dictionary = { 'routes.account': 'account' }
        expect(localizedHref('en', 'account', dict, 'orders')).toBe('en/account/orders')
    })

    it('returns locale string for home route', () => {
        const dict: Dictionary = { 'routes.home': '' }
        // Home route: parts = ['', 'es', ''].filter(Boolean) → ['es'] → 'es'
        expect(localizedHref('es', 'home', dict)).toBe('es')
    })
})

describe('buildReverseSlugMap', () => {
    it('maps localized slugs to canonical slugs', () => {
        const dict: Dictionary = {
            'routes.products': 'products',
            'routes.cart': 'cart',
            'routes.account': 'account',
        }
        const map = buildReverseSlugMap(dict)
        // 'products' !== 'productos' (canonical), so it should be mapped
        expect(map.get('products')).toBe('productos')
        expect(map.get('cart')).toBe('carrito')
        expect(map.get('account')).toBe('cuenta')
    })

    it('does not include entries where localized === canonical', () => {
        const dict: Dictionary = {
            'routes.login': 'login', // same as canonical
        }
        const map = buildReverseSlugMap(dict)
        expect(map.has('login')).toBe(false)
    })
})
