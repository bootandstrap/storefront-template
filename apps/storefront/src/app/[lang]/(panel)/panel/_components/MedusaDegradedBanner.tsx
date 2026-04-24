/**
 * MedusaDegradedBanner — Warning banner when Medusa is unavailable
 *
 * Extracted from dashboard monolith. Shows only when medusaDegraded is true.
 */

import Link from 'next/link'
import { SotaBentoItem } from '@/components/panel'
import type { DashboardContext } from '../_lib/dashboard-context'

interface MedusaDegradedBannerProps {
    ctx: DashboardContext
}

export default function MedusaDegradedBanner({ ctx }: MedusaDegradedBannerProps) {
    const { lang, t, medusaDegraded } = ctx

    if (!medusaDegraded) return null

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <div className="rounded-2xl border-2 border-amber-400/50 bg-amber-50/20 px-5 py-4 backdrop-blur-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-600 text-lg">⚠️</div>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">{t('panel.dashboard.medusaDegraded')}</p>
                        <p className="text-xs text-amber-600 mt-0.5">Las estadísticas de productos, pedidos e ingresos no están disponibles. Verifica que Medusa esté corriendo en el puerto 9000.</p>
                    </div>
                </div>
                <Link
                    href={`/${lang}/panel`}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 text-xs font-medium hover:bg-amber-500/30 transition-colors"
                >
                    Reintentar
                </Link>
            </div>
        </SotaBentoItem>
    )
}
