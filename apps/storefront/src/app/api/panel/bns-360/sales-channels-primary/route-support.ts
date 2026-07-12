import 'server-only'

import { clearCachedConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type {
    Bns360SalesChannelsConfig,
    Bns360SalesChannelsConfigUpdate,
    Bns360SalesChannelsPrimaryClient,
} from '@/lib/bns-360/sales-channels-primary-journey'

interface SalesChannelsConfigRow {
    sales_whatsapp_greeting: string | null
    sales_preferred_contact: string | null
    sales_business_hours_display: string | null
    sales_highlight_free_shipping: boolean | null
}

interface SalesChannelsFlagsRow {
    enable_whatsapp_checkout: boolean | null
    enable_online_payments: boolean | null
    enable_cash_on_delivery: boolean | null
    enable_bank_transfer: boolean | null
}

interface SalesChannelsLimitsRow {
    max_payment_methods: number | null
}

export function createBns360SalesChannelsPrimaryClient(
    tenantId: string
): Bns360SalesChannelsPrimaryClient {
    return {
        async readConfig() {
            return readSalesChannelsConfig(tenantId)
        },

        async updateConfig(updates) {
            await updateSalesChannelsConfig(tenantId, updates)
        },
    }
}

async function readSalesChannelsConfig(tenantId: string): Promise<Bns360SalesChannelsConfig> {
    const supabase = await createClient()

    const [configResult, flagsResult, limitsResult] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('config')
            .select('sales_whatsapp_greeting,sales_preferred_contact,sales_business_hours_display,sales_highlight_free_shipping')
            .eq('tenant_id', tenantId)
            .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('feature_flags')
            .select('enable_whatsapp_checkout,enable_online_payments,enable_cash_on_delivery,enable_bank_transfer')
            .eq('tenant_id', tenantId)
            .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('plan_limits')
            .select('max_payment_methods')
            .eq('tenant_id', tenantId)
            .single(),
    ])

    if (configResult.error) {
        throw new Error(`Sales channels config read failed: ${configResult.error.message}`)
    }
    if (flagsResult.error) {
        throw new Error(`Sales channels feature flags read failed: ${flagsResult.error.message}`)
    }
    if (limitsResult.error) {
        throw new Error(`Sales channels plan limits read failed: ${limitsResult.error.message}`)
    }

    return normalizeSalesChannelsConfig(
        configResult.data as SalesChannelsConfigRow,
        flagsResult.data as SalesChannelsFlagsRow,
        limitsResult.data as SalesChannelsLimitsRow
    )
}

function normalizeSalesChannelsConfig(
    config: SalesChannelsConfigRow,
    flags: SalesChannelsFlagsRow,
    limits: SalesChannelsLimitsRow
): Bns360SalesChannelsConfig {
    return {
        salesWhatsappGreeting: config.sales_whatsapp_greeting ?? null,
        salesPreferredContact: config.sales_preferred_contact ?? null,
        salesBusinessHoursDisplay: config.sales_business_hours_display ?? null,
        salesHighlightFreeShipping: config.sales_highlight_free_shipping === true,
        featureFlags: {
            enable_whatsapp_checkout: flags.enable_whatsapp_checkout === true,
            enable_online_payments: flags.enable_online_payments === true,
            enable_cash_on_delivery: flags.enable_cash_on_delivery === true,
            enable_bank_transfer: flags.enable_bank_transfer === true,
        },
        planLimits: {
            max_payment_methods: limits.max_payment_methods ?? 0,
        },
    }
}

async function updateSalesChannelsConfig(
    tenantId: string,
    updates: Bns360SalesChannelsConfigUpdate
): Promise<void> {
    const payload = toConfigPayload(updates)
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: existingError } = await (supabase as any)
        .from('config')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1)
        .single()

    if (existingError) {
        throw new Error(`Sales channels config lookup failed: ${existingError.message}`)
    }
    if (!existing?.id) {
        throw new Error('Sales channels config lookup returned no row')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('config')
        .update(payload)
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
        .select('tenant_id')

    if (error) {
        throw new Error(error.message)
    }
    if (!data || data.length === 0) {
        throw new Error('Sales channels config update affected zero rows')
    }

    clearCachedConfig()
}

function toConfigPayload(updates: Bns360SalesChannelsConfigUpdate): Record<string, unknown> {
    return {
        sales_whatsapp_greeting: updates.salesWhatsappGreeting ?? null,
        sales_preferred_contact: updates.salesPreferredContact ?? null,
        sales_business_hours_display: updates.salesBusinessHoursDisplay ?? null,
        sales_highlight_free_shipping: updates.salesHighlightFreeShipping,
    }
}
