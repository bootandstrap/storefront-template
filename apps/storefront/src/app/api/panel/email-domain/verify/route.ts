import { NextResponse } from 'next/server'
import { requirePanelAuth } from '@/lib/panel-auth'
import { logger } from '@/lib/logger'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RESEND_API_URL = 'https://api.resend.com'

/**
 * POST /api/panel/email-domain/verify
 * Triggers DNS verification for the custom domain
 */
export async function POST() {
    try {
        const { tenantId, supabase } = await requirePanelAuth()

        // Get domain ID from config
        const { data: config } = await supabase
            .from('config')
            .select('custom_email_domain, custom_email_domain_id, custom_email_domain_status')
            .eq('tenant_id', tenantId)
            .single()

        if (!config?.custom_email_domain_id) {
            return NextResponse.json(
                { error: 'No custom domain configured' },
                { status: 404 }
            )
        }

        if (config.custom_email_domain_status === 'verified') {
            return NextResponse.json({
                success: true,
                status: 'verified',
                message: 'Domain is already verified',
            })
        }

        if (!RESEND_API_KEY) {
            return NextResponse.json(
                { error: 'Email provider not configured' },
                { status: 500 }
            )
        }

        // Trigger verification via Resend
        const verifyRes = await fetch(
            `${RESEND_API_URL}/domains/${config.custom_email_domain_id}/verify`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
            }
        )

        if (!verifyRes.ok) {
            const err = await verifyRes.text()
            logger.error('[email-domain/verify] Resend verify failed:', err)
            return NextResponse.json(
                { error: 'Verification request failed. Check DNS records.' },
                { status: 502 }
            )
        }

        // Check the domain status after verify
        const domainRes = await fetch(
            `${RESEND_API_URL}/domains/${config.custom_email_domain_id}`,
            { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
        )

        let newStatus: 'pending' | 'verified' | 'failed' = 'pending'
        if (domainRes.ok) {
            const domainData = await domainRes.json()
            if (domainData.status === 'verified') {
                newStatus = 'verified'
            }
        }

        // Update status in config
        await supabase
            .from('config')
            .update({ custom_email_domain_status: newStatus })
            .eq('tenant_id', tenantId)

        return NextResponse.json({
            success: true,
            status: newStatus,
            domain: config.custom_email_domain,
            message: newStatus === 'verified'
                ? '✅ Domain verified! Emails will now be sent from your domain.'
                : '⏳ DNS records not yet propagated. Try again in a few minutes.',
        })
    } catch (e) {
        logger.error('[email-domain/verify] error:', e)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
