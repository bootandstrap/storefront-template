import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { createPrintEngine } from '@/lib/pos/print-engine'
import { createVirtualPrinterLab } from '@/lib/pos/virtual-printer'
import { runPOSVirtualPrinterSelfTest } from '@/lib/pos/virtual-printer-tools'

export async function GET(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { appConfig } = await withPanelGuard({ requiredFlag: 'enable_pos' })
        const { searchParams } = new URL(req.url)
        const paperWidth = searchParams.get('paperWidth') === '58mm' ? '58mm' : '80mm'
        const printerId = searchParams.get('printerId') || undefined
        const openCashDrawer = searchParams.get('openCashDrawer') === '1'
        const engine = createPrintEngine({ virtualLab: createVirtualPrinterLab() })
        const result = await runPOSVirtualPrinterSelfTest(engine, {
            printerId,
            paperWidth,
            openCashDrawer,
            businessName: appConfig.config.business_name || 'BootandStrap Virtual POS',
            business: {
                address: appConfig.config.store_address || undefined,
                phone: appConfig.config.store_phone || undefined,
                email: appConfig.config.store_email || undefined,
            },
        })

        return NextResponse.json({
            schema: 'bootandstrap.pos.virtual-printer.self-test/v1',
            status: 'verified',
            printer: result.printer,
            jobs: result.jobs,
        }, { headers: rateLimitResult.headers })
    } catch (error) {
        logger.error('[pos-virtual-printer-self-test] Error:', error)
        return toPanelErrorResponse(error)
    }
}
