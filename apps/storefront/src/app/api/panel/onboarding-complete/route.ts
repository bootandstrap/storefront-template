/**
 * POST /api/panel/onboarding-complete
 *
 * Persists ALL onboarding wizard data:
 * - config: business_name, whatsapp_number, store_email, onboarding_completed
 * - feature_flags: payment method toggles
 *
 * Protected by panel auth (owner role).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearCachedConfig } from '@/lib/config'
import { z } from 'zod'

// Zod schema for onboarding data
const onboardingSchema = z.object({
    businessName: z.string().min(1).max(200).optional(),
    whatsapp: z.string().max(30).optional(),
    email: z.string().email().optional().or(z.literal('')),
    paymentMethods: z.array(z.enum(['whatsapp', 'card', 'cod', 'bank'])).optional(),
})

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant_id and role from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id || profile.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate body
    let body: z.infer<typeof onboardingSchema> = {}
    try {
        const raw = await request.json()
        body = onboardingSchema.parse(raw)
    } catch {
        // If body parsing fails, still mark onboarding complete (backward compatibility)
    }

    // Build config update payload
    const configUpdate: Record<string, unknown> = {
        onboarding_completed: true,
    }

    if (body.businessName) {
        configUpdate.business_name = body.businessName
    }
    if (body.whatsapp) {
        configUpdate.whatsapp_number = body.whatsapp
    }
    if (body.email) {
        configUpdate.store_email = body.email
    }

    // Update config table
    const { error: configError } = await supabase
        .from('config')
        .update(configUpdate)
        .eq('tenant_id', profile.tenant_id)

    if (configError) {
        console.error('[onboarding-complete] Failed to update config:', configError)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }

    // Update feature_flags for payment methods (if provided)
    if (body.paymentMethods && body.paymentMethods.length > 0) {
        const flagsUpdate: Record<string, boolean> = {
            enable_whatsapp_checkout: body.paymentMethods.includes('whatsapp'),
            enable_online_payments: body.paymentMethods.includes('card'),
            enable_cash_on_delivery: body.paymentMethods.includes('cod'),
            enable_bank_transfer: body.paymentMethods.includes('bank'),
        }

        const { error: flagsError } = await supabase
            .from('feature_flags')
            .update(flagsUpdate)
            .eq('tenant_id', profile.tenant_id)

        if (flagsError) {
            console.error('[onboarding-complete] Failed to update feature_flags:', flagsError)
            // Non-fatal — config already saved, payment flags can be changed later
        }
    }

    clearCachedConfig()

    return NextResponse.json({ success: true })
}
