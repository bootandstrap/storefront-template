import Link from 'next/link'
import {
    Apple,
    Leaf,
    Sun,
    Package,
    Gift,
    Coffee,
    Droplets,
    ShoppingBag,
    Gem,
    Shirt,
    Home,
    Dumbbell,
    Laptop,
    Baby,
    type LucideIcon,
} from 'lucide-react'
import { getCategories } from '@/lib/medusa/client'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'

// Template-agnostic category → icon mapping
// Covers common e-commerce category types across different businesses
const CATEGORY_ICONS: Record<string, LucideIcon> = {
    // Food & drink
    frutas: Apple,
    citricos: Sun,
    tropicales: Leaf,
    temporada: Sun,
    surtidas: Gift,
    artesanales: Coffee,
    verduras: Leaf,
    organicos: Leaf,
    bebidas: Droplets,
    jugos: Droplets,
    // General retail
    ropa: Shirt,
    moda: Shirt,
    hogar: Home,
    deporte: Dumbbell,
    tecnologia: Laptop,
    bebe: Baby,
    joyeria: Gem,
    accesorios: ShoppingBag,
    // Catch-all
    combos: Gift,
    packs: Gift,
    ofertas: Gift,
}

function getCategoryIcon(handle: string | undefined): LucideIcon {
    if (!handle) return Package
    const key = handle.toLowerCase().replace(/[-_]/g, '')
    // Check for partial matches
    for (const [keyword, icon] of Object.entries(CATEGORY_ICONS)) {
        if (key.includes(keyword)) return icon
    }
    return Package
}

interface CategoryGridProps {
    dictionary: Dictionary
}

export default async function CategoryGrid({ dictionary }: CategoryGridProps) {
    const t = createTranslator(dictionary)
    const categories = await getCategories()

    if (!categories.length) return null

    return (
        <section data-testid="category-grid" className="py-12 md:py-16">
            <div className="container-page">
                <h2 className="text-2xl md:text-3xl font-bold font-display text-text-primary mb-8 text-center">
                    {t('product.categories')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                    {categories.slice(0, 10).map((cat) => {
                        const Icon = getCategoryIcon(cat.handle)
                        return (
                            <Link
                                key={cat.id}
                                href={`/productos?category=${cat.handle}`}
                                className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-surface-1 transition-all duration-200"
                            >
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-surface-2 flex items-center justify-center group-hover:bg-secondary/20 group-hover:scale-110 transition-all duration-300">
                                    <Icon className="w-7 h-7 md:w-8 md:h-8 text-primary" strokeWidth={1.5} />
                                </div>
                                <span className="text-sm font-medium text-text-secondary group-hover:text-primary transition-colors text-center">
                                    {cat.name}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
