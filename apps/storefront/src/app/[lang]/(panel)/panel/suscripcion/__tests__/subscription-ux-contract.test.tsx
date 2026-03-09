import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SubscriptionExperience, pickRecommendedModule } from '../subscription-experience'
import type { ModuleCatalogEntry } from '@/lib/governance-contract'

const sampleModule: ModuleCatalogEntry = {
    key: 'chatbot',
    name: 'Chatbot IA',
    icon: '🤖',
    description: 'Atiende clientes con respuestas automáticas.',
    category: 'intelligence',
    popular: true,
    requires: [],
    tiers: [
        {
            key: 'basic',
            name: 'Basic',
            price_chf: 20,
            features: ['Widget web', '500 mensajes/mes'],
            recommended: false,
        },
    ],
}

describe('subscription ux contract', () => {
    it('renders non-technical module card sections', () => {
        const html = renderToStaticMarkup(
            <SubscriptionExperience
                t={(key) => key}
                purchasedModule={null}
                tenantStatus="active"
                error={null}
                activeModules={[]}
                activeModuleOrders={[]}
                availableModules={[sampleModule]}
                selectedTiers={{}}
                purchasingModule={null}
                hasStripeCustomer={false}
                isPending={false}
                recommendedModule={sampleModule}
                activeMonthlyEstimate={40}
                maintenancePrice={40}
                onTierChange={() => {}}
                onPurchase={() => {}}
                onManageBilling={() => {}}
            />
        )

        expect(html).toContain('Qué incluye')
        expect(html).toContain('Precio mensual estimado')
    })

    it('recommends ecommerce first when not active', () => {
        const ecommerceModule: ModuleCatalogEntry = {
            ...sampleModule,
            key: 'ecommerce',
            name: 'Tienda Online',
        }
        const recommended = pickRecommendedModule([sampleModule, ecommerceModule], new Set())
        expect(recommended?.key).toBe('ecommerce')
    })
})
