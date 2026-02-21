import { Leaf, Truck, BadgeDollarSign, Smartphone } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'

interface TrustSectionProps {
    dictionary: Dictionary
}

export default function TrustSection({ dictionary }: TrustSectionProps) {
    const t = createTranslator(dictionary)

    const trustItems = [
        {
            icon: Leaf,
            title: t('trust.freshDaily'),
            description: t('trust.freshDailyDesc'),
            color: 'text-green-500',
            bgColor: 'bg-green-100 dark:bg-green-900/30',
        },
        {
            icon: Truck,
            title: t('trust.fastDelivery'),
            description: t('trust.fastDeliveryDesc'),
            color: 'text-blue-500',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            icon: BadgeDollarSign,
            title: t('trust.bestPrice'),
            description: t('trust.bestPriceDesc'),
            color: 'text-amber-500',
            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            icon: Smartphone,
            title: t('trust.easyOrder'),
            description: t('trust.easyOrderDesc'),
            color: 'text-purple-500',
            bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        },
    ]

    return (
        <section className="py-12 md:py-16">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-text-primary mb-8 text-center">
                {t('trust.title')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {trustItems.map((item) => (
                    <div key={item.title} className="text-center p-4 md:p-6 rounded-xl bg-surface-1 hover:bg-surface-2 card-lift">
                        <div className={`w-12 h-12 mx-auto mb-4 rounded-full ${item.bgColor} flex items-center justify-center`}>
                            <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <h3 className="font-semibold text-text-primary mb-1 text-sm md:text-base">
                            {item.title}
                        </h3>
                        <p className="text-xs md:text-sm text-text-muted">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    )
}
