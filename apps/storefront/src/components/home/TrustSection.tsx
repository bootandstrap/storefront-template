import { CheckCircle, Truck, BadgeCheck, Smartphone } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'

interface TrustSectionProps {
    dictionary: Dictionary
}

export default function TrustSection({ dictionary }: TrustSectionProps) {
    const t = createTranslator(dictionary)

    const trustItems = [
        {
            icon: CheckCircle,
            title: t('trust.freshDaily'),
            description: t('trust.freshDailyDesc'),
        },
        {
            icon: Truck,
            title: t('trust.fastDelivery'),
            description: t('trust.fastDeliveryDesc'),
        },
        {
            icon: BadgeCheck,
            title: t('trust.bestPrice'),
            description: t('trust.bestPriceDesc'),
        },
        {
            icon: Smartphone,
            title: t('trust.easyOrder'),
            description: t('trust.easyOrderDesc'),
        },
    ]

    return (
        <section className="py-10 border-y border-sf-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-sf-2">
                {trustItems.map((item, i) => (
                    <div
                        key={item.title}
                        className={`flex flex-col items-center text-center px-6 py-4 animate-slide-up-stagger stagger-${i + 1}`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center mb-3">
                            <item.icon
                                className="w-5 h-5 text-brand"
                                strokeWidth={1.5}
                            />
                        </div>
                        <h3 className="text-sm font-semibold text-tx mb-0.5">
                            {item.title}
                        </h3>
                        <p className="text-xs text-tx-muted leading-snug">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    )
}
