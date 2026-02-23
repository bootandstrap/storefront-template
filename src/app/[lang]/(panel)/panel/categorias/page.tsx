/**
 * Categories Manager — Owner Panel
 *
 * Server component fetches categories + plan limits.
 */

import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminCategories } from '@/lib/medusa/admin'
import { checkLimit } from '@/lib/limits'
import { requirePanelAuth } from '@/lib/panel-auth'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import CategoriesClient from './CategoriesClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.categories.title') }
}

export default async function CategoriesManagerPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId } = await requirePanelAuth()
    const scope = await getTenantMedusaScope(tenantId)
    const { planLimits } = await getConfigForTenant(tenantId)

    const categoriesData = await getAdminCategories({ limit: 50 }, scope)
    const limitCheck = checkLimit(planLimits, 'max_categories', categoriesData.count)

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const labels = {
        title: t('panel.categories.title'),
        subtitle: t('panel.categories.subtitle'),
        addCategory: t('panel.categories.add'),
        editCategory: t('panel.categories.edit'),
        noCategories: t('panel.categories.empty'),
        name: t('panel.categories.name'),
        description: t('panel.categories.description'),
        confirmDelete: t('panel.categories.confirmDelete'),
        categories: t('panel.categories.categoriesLabel'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        create: t('common.create'),
        delete: t('common.delete'),
        edit: t('common.edit'),
        maxReached: t('limits.maxReached'),
    }

    return (
        <div className="space-y-6">
            <CategoriesClient
                categories={categoriesData.product_categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    handle: c.handle,
                    description: c.description,
                }))}
                categoryCount={categoriesData.count}
                maxCategories={planLimits.max_categories}
                canAdd={limitCheck.allowed}
                labels={labels}
            />
        </div>
    )
}
