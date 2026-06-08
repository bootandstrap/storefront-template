const EMAIL_TIER_PRICES = {
    basic: 15,
    pro: 30,
} as const

function formatTierPrice(tier: keyof typeof EMAIL_TIER_PRICES): string {
    return `${EMAIL_TIER_PRICES[tier]} CHF/mo`
}

export interface EmailDesign {
    slug: string
    name: string
    description_es: string
    requiredTier: string | null
    price_label?: string
}

export const EMAIL_DESIGNS: EmailDesign[] = [
    {
        slug: 'minimal',
        name: 'Minimal',
        description_es: 'Limpio y profesional. Perfecto para cualquier tienda.',
        requiredTier: null,
    },
    {
        slug: 'brand',
        name: 'Brand Premium',
        description_es: 'Con logo, colores de marca y footer personalizado.',
        requiredTier: 'basic',
        price_label: formatTierPrice('basic'),
    },
    {
        slug: 'modern',
        name: 'Modern Pro',
        description_es: 'Diseño premium oscuro con gradientes, sombras sofisticadas y tipografía moderna.',
        requiredTier: 'pro',
        price_label: formatTierPrice('pro'),
    },
]

export function getDesignBySlug(slug: string): EmailDesign {
    return EMAIL_DESIGNS.find(d => d.slug === slug) || EMAIL_DESIGNS[0]
}
