import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
    Bns360EmailAutomationConfig,
    Bns360EmailMarketingPrimaryClient,
    Bns360EmailMarketingState,
    Bns360EmailPreferences,
} from '@/lib/bns-360/email-marketing-primary-journey'

interface EmailPreferencesRow {
    send_order_confirmation: boolean | null
    send_abandoned_cart: boolean | null
    send_review_request: boolean | null
    template_design: string | null
}

interface EmailAutomationRow {
    abandoned_cart_enabled: boolean | null
    abandoned_cart_delay_hours: number | null
    review_request_enabled: boolean | null
    review_request_delay_days: number | null
}

interface EmailLimitsRow {
    max_email_sends_month: number | null
}

const DEFAULT_PREFERENCES: Bns360EmailPreferences = {
    send_order_confirmation: true,
    send_abandoned_cart: true,
    send_review_request: true,
    template_design: 'minimal',
}

const DEFAULT_AUTOMATION: Bns360EmailAutomationConfig = {
    abandoned_cart_enabled: false,
    abandoned_cart_delay_hours: 3,
    review_request_enabled: false,
    review_request_delay_days: 7,
}

const globalForBns360EmailMarketing = globalThis as unknown as {
    __bns360EmailMarketingClient?: SupabaseClient
}

export function createBns360EmailMarketingPrimaryClient(
    tenantId: string
): Bns360EmailMarketingPrimaryClient {
    return {
        async readState() {
            return readEmailMarketingState(tenantId)
        },

        async updatePreferences(values) {
            await upsertEmailPreferences(tenantId, values)
        },

        async updateAutomation(values) {
            await upsertEmailAutomation(tenantId, values)
        },

        async restoreState(snapshot) {
            await restoreEmailMarketingState(tenantId, snapshot)
        },
    }
}

async function readEmailMarketingState(tenantId: string): Promise<Bns360EmailMarketingState> {
    const supabase = createEmailMarketingServiceClient()
    const preferences = await readEmailPreferences(supabase, tenantId)
    const automation = await readEmailAutomation(supabase, tenantId)
    const limits = await readEmailLimits(supabase, tenantId)

    return { preferences, automation, limits }
}

async function readEmailPreferences(
    supabase: SupabaseClient,
    tenantId: string
): Promise<Bns360EmailMarketingState['preferences']> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('email_preferences')
        .select('send_order_confirmation,send_abandoned_cart,send_review_request,template_design')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        throw new Error(`Email preferences read failed: ${error.message}`)
    }

    return {
        exists: Boolean(data),
        values: normalizeEmailPreferences(data as EmailPreferencesRow | null),
    }
}

async function readEmailAutomation(
    supabase: SupabaseClient,
    tenantId: string
): Promise<Bns360EmailMarketingState['automation']> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('email_automation_config')
        .select('abandoned_cart_enabled,abandoned_cart_delay_hours,review_request_enabled,review_request_delay_days')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        throw new Error(`Email automation read failed: ${error.message}`)
    }

    return {
        exists: Boolean(data),
        values: normalizeEmailAutomation(data as EmailAutomationRow | null),
    }
}

async function readEmailLimits(
    supabase: SupabaseClient,
    tenantId: string
): Promise<Bns360EmailMarketingState['limits']> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('plan_limits')
        .select('max_email_sends_month')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        throw new Error(`Email limits read failed: ${error.message}`)
    }

    return {
        max_email_sends_month: normalizeEmailLimits(data as EmailLimitsRow | null),
    }
}

function normalizeEmailPreferences(row: EmailPreferencesRow | null): Bns360EmailPreferences {
    return {
        send_order_confirmation: row?.send_order_confirmation ?? DEFAULT_PREFERENCES.send_order_confirmation,
        send_abandoned_cart: row?.send_abandoned_cart ?? DEFAULT_PREFERENCES.send_abandoned_cart,
        send_review_request: row?.send_review_request ?? DEFAULT_PREFERENCES.send_review_request,
        template_design: row?.template_design ?? DEFAULT_PREFERENCES.template_design,
    }
}

function normalizeEmailAutomation(row: EmailAutomationRow | null): Bns360EmailAutomationConfig {
    return {
        abandoned_cart_enabled: row?.abandoned_cart_enabled ?? DEFAULT_AUTOMATION.abandoned_cart_enabled,
        abandoned_cart_delay_hours: row?.abandoned_cart_delay_hours ?? DEFAULT_AUTOMATION.abandoned_cart_delay_hours,
        review_request_enabled: row?.review_request_enabled ?? DEFAULT_AUTOMATION.review_request_enabled,
        review_request_delay_days: row?.review_request_delay_days ?? DEFAULT_AUTOMATION.review_request_delay_days,
    }
}

function normalizeEmailLimits(row: EmailLimitsRow | null): number {
    return row?.max_email_sends_month ?? 0
}

async function upsertEmailPreferences(tenantId: string, values: Bns360EmailPreferences): Promise<void> {
    const supabase = createEmailMarketingServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('email_preferences')
        .upsert(
            {
                tenant_id: tenantId,
                ...values,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        throw new Error(`Email preferences update failed: ${error.message}`)
    }
}

async function upsertEmailAutomation(tenantId: string, values: Bns360EmailAutomationConfig): Promise<void> {
    const supabase = createEmailMarketingServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('email_automation_config')
        .upsert(
            {
                tenant_id: tenantId,
                ...values,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        throw new Error(`Email automation update failed: ${error.message}`)
    }
}

async function restoreEmailMarketingState(
    tenantId: string,
    snapshot: Bns360EmailMarketingState
): Promise<void> {
    await restoreEmailPreferences(tenantId, snapshot.preferences)
    await restoreEmailAutomation(tenantId, snapshot.automation)
}

async function restoreEmailPreferences(
    tenantId: string,
    snapshot: Bns360EmailMarketingState['preferences']
): Promise<void> {
    if (snapshot.exists) {
        await upsertEmailPreferences(tenantId, snapshot.values)
        return
    }

    await deleteTenantRow('email_preferences', tenantId, 'Email preferences cleanup')
}

async function restoreEmailAutomation(
    tenantId: string,
    snapshot: Bns360EmailMarketingState['automation']
): Promise<void> {
    if (snapshot.exists) {
        await upsertEmailAutomation(tenantId, snapshot.values)
        return
    }

    await deleteTenantRow('email_automation_config', tenantId, 'Email automation cleanup')
}

async function deleteTenantRow(table: 'email_preferences' | 'email_automation_config', tenantId: string, label: string) {
    const supabase = createEmailMarketingServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('tenant_id', tenantId)

    if (error) {
        throw new Error(`${label} failed: ${error.message}`)
    }
}

function createEmailMarketingServiceClient(): SupabaseClient {
    if (globalForBns360EmailMarketing.__bns360EmailMarketingClient) {
        return globalForBns360EmailMarketing.__bns360EmailMarketingClient
    }

    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            '[bns-360-email-marketing] GOVERNANCE_SUPABASE_SERVICE_KEY ' +
            '(or SUPABASE_SERVICE_ROLE_KEY) is required for service-only email tables'
        )
    }

    globalForBns360EmailMarketing.__bns360EmailMarketingClient = createSupabaseClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForBns360EmailMarketing.__bns360EmailMarketingClient
}
