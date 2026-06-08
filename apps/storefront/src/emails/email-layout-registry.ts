import type { LayoutComponent } from './types'

const layoutLoaders: Record<string, () => Promise<{ default: LayoutComponent }>> = {
    minimal: () => import('@/emails/layouts/MinimalLayout'),
    brand: () => import('@/emails/layouts/BrandLayout'),
    modern: () => import('@/emails/layouts/ModernLayout'),
}

export async function loadEmailLayout(slug: string): Promise<LayoutComponent> {
    const loader = layoutLoaders[slug]
    if (!loader) {
        const fallback = await layoutLoaders.minimal()
        return fallback.default
    }
    const mod = await loader()
    return mod.default
}
