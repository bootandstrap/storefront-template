import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RESEND_API_URL = 'https://api.resend.com'

// ── Types ────────────────────────────────────────────────────
interface TenantConfig {
    custom_email_domain?: string | null
    custom_email_domain_status?: string | null
    custom_email_domain_id?: string | null
}

interface TenantFlags {
    flags?: Record<string, boolean>
}

interface DnsRecord {
    record: string
    name: string
    value: string
    type: string
    status: string
    ttl: string
    priority?: number
}

interface ResendDomain {
    id: string
    name: string
    status: string
    records: DnsRecord[]
}

// Helper: get tenant context
function getTenantContext() {
    const tenantId = process.env.TENANT_ID
    if (!tenantId) return null

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    return { tenantId, supabase }
}

/**
 * GET /api/panel/email-domain
 * Returns current custom domain configuration + DNS records
 */
export async function GET() {
    try {
        const ctx = getTenantContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { tenantId, supabase } = ctx

        // Check governance flag
        const { data: flagsRaw } = await supabase
            .from('feature_flags')
            .select('flags')
            .eq('tenant_id', tenantId)
            .single()

        const flagsData = flagsRaw as TenantFlags | null
        if (!flagsData?.flags?.enable_custom_email_domain) {
            return NextResponse.json({
                enabled: false,
                message: 'Custom email domain requires email_marketing Enterprise tier',
                upsell: {
                    module: 'email_marketing',
                    tier: 'enterprise',
                    price_chf: 50,
                },
            })
        }

        // Get current domain config
        const { data: configRaw } = await supabase
            .from('config')
            .select('custom_email_domain, custom_email_domain_status, custom_email_domain_id')
            .eq('tenant_id', tenantId)
            .single()

        const config = configRaw as TenantConfig | null

        if (!config?.custom_email_domain) {
            return NextResponse.json({
                enabled: true,
                domain: null,
                status: 'none',
                records: [],
            })
        }

        // If domain exists, fetch DNS records from Resend
        let records: DnsRecord[] = []

        if (config.custom_email_domain_id && RESEND_API_KEY) {
            try {
                const res = await fetch(
                    `${RESEND_API_URL}/domains/${config.custom_email_domain_id}`,
                    { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
                )
                if (res.ok) {
                    const domain = (await res.json()) as ResendDomain
                    records = domain.records || []
                    // Sync status from Resend
                    if (domain.status === 'verified' && config.custom_email_domain_status !== 'verified') {
                        await supabase
                            .from('config')
                            .update({ custom_email_domain_status: 'verified' } as never)
                            .eq('tenant_id', tenantId)
                    }
                }
            } catch (e) {
                console.error('[email-domain] Failed to fetch Resend domain:', e)
            }
        }

        return NextResponse.json({
            enabled: true,
            domain: config.custom_email_domain,
            status: config.custom_email_domain_status || 'none',
            domainId: config.custom_email_domain_id,
            records,
        })
    } catch (e) {
        console.error('[email-domain] GET error:', e)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * POST /api/panel/email-domain
 * Register a new custom sender domain via Resend API
 * Body: { domain: "campifruit.co" }
 */
export async function POST(req: NextRequest) {
    try {
        const ctx = getTenantContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { tenantId, supabase } = ctx

        // Check governance flag
        const { data: flagsRaw } = await supabase
            .from('feature_flags')
            .select('flags')
            .eq('tenant_id', tenantId)
            .single()

        const flagsData = flagsRaw as TenantFlags | null
        if (!flagsData?.flags?.enable_custom_email_domain) {
            return NextResponse.json(
                { error: 'Custom email domain requires email_marketing Enterprise tier' },
                { status: 403 }
            )
        }

        const body = await req.json()
        const domain = (body.domain as string)?.trim()?.toLowerCase()

        if (!domain || !domain.includes('.') || domain.length < 4) {
            return NextResponse.json(
                { error: 'Invalid domain. Example: campifruit.co' },
                { status: 400 }
            )
        }

        // Block bootandstrap.com and subdomains
        if (domain === 'bootandstrap.com' || domain.endsWith('.bootandstrap.com')) {
            return NextResponse.json(
                { error: 'Cannot use bootandstrap.com as custom domain' },
                { status: 400 }
            )
        }

        // Check if tenant already has a domain
        const { data: existingRaw } = await supabase
            .from('config')
            .select('custom_email_domain, custom_email_domain_id')
            .eq('tenant_id', tenantId)
            .single()

        const existing = existingRaw as TenantConfig | null

        if (existing?.custom_email_domain) {
            return NextResponse.json(
                { error: `Already have domain: ${existing.custom_email_domain}. Delete it first.` },
                { status: 409 }
            )
        }

        // Register domain with Resend
        if (!RESEND_API_KEY) {
            return NextResponse.json(
                { error: 'Email provider not configured' },
                { status: 500 }
            )
        }

        const resendRes = await fetch(`${RESEND_API_URL}/domains`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: domain, region: 'eu-west-1' }),
        })

        if (!resendRes.ok) {
            const err = await resendRes.text()
            console.error('[email-domain] Resend create domain failed:', err)
            return NextResponse.json(
                { error: `Failed to register domain: ${err}` },
                { status: 502 }
            )
        }

        const resendDomain = (await resendRes.json()) as ResendDomain

        // Save to config
        await supabase
            .from('config')
            .update({
                custom_email_domain: domain,
                custom_email_domain_status: 'pending',
                custom_email_domain_id: resendDomain.id,
            } as never)
            .eq('tenant_id', tenantId)

        return NextResponse.json({
            success: true,
            domain,
            status: 'pending',
            domainId: resendDomain.id,
            records: resendDomain.records,
            message: 'Domain registered. Add the DNS records shown below, then click Verify.',
        })
    } catch (e) {
        console.error('[email-domain] POST error:', e)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * DELETE /api/panel/email-domain
 * Remove custom domain from tenant + Resend
 */
export async function DELETE() {
    try {
        const ctx = getTenantContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { tenantId, supabase } = ctx

        const { data: configRaw } = await supabase
            .from('config')
            .select('custom_email_domain_id')
            .eq('tenant_id', tenantId)
            .single()

        const config = configRaw as TenantConfig | null

        // Delete from Resend
        if (config?.custom_email_domain_id && RESEND_API_KEY) {
            try {
                await fetch(`${RESEND_API_URL}/domains/${config.custom_email_domain_id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
                })
            } catch (e) {
                console.error('[email-domain] Resend delete failed:', e)
            }
        }

        // Clear config
        await supabase
            .from('config')
            .update({
                custom_email_domain: null,
                custom_email_domain_status: 'none',
                custom_email_domain_id: null,
            } as never)
            .eq('tenant_id', tenantId)

        return NextResponse.json({ success: true, message: 'Custom domain removed' })
    } catch (e) {
        console.error('[email-domain] DELETE error:', e)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
