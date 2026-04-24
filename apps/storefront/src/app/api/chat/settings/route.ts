/**
 * Chat Settings API Route
 * GET: Fetch chatbot settings (public: limits only, admin: full)
 * PUT: Update chatbot settings (owner/admin only)
 * All operations are tenant-scoped.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, API_GUARD } from '@/lib/security/api-rate-guard'
import { chatSettingsTable, profilesTable } from '@/lib/chat/db'
import { clearSettingsCache } from '@/lib/chat/settings-loader'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
    try {
        const rl = await withRateLimit(req, API_GUARD)
        if (rl.limited) return rl.response!

        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not configured' }, { status: 500 })
        }

        const supabase = await createClient()

        // Fetch settings for this tenant (with fallback for pre-migration schema)
        let data: Array<{ key: string; value: string | null; description?: string; updated_at?: string }> | null = null
        let fetchError: { code?: string; message?: string } | null = null

        // Try tenant-scoped query first
        const result = await chatSettingsTable()
            .select('key, value, description, updated_at')
            .eq('tenant_id', tenantId)
            .order('key')
        
        if (result.error?.code === '42703') {
            // Column tenant_id doesn't exist yet — fall back to global key-value
            const fallback = await chatSettingsTable()
                .select('key, value, description, updated_at')
                .order('key')
            data = fallback.data
            fetchError = fallback.error
        } else {
            data = result.data
            fetchError = result.error
        }

        if (fetchError) {
            logger.error('[ChatSettings] Error fetching:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
        }

        // Convert to key-value object
        const settings: Record<string, string> = {}
        data?.forEach((row: { key: string; value: string | null }) => {
            settings[row.key] = String(row.value ?? '')
        })

        // Check auth for full access
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { data: profile } = await profilesTable()
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'owner' || profile?.role === 'super_admin') {
                return NextResponse.json({ settings, raw: data })
            }
        }

        // Public: return only safe config
        const safeKeys = [
            'anonymous_message_limit', 'registered_message_limit', 'paying_message_limit',
            'welcome_message_es', 'welcome_message_en', 'welcome_message_de',
            'welcome_message_fr', 'welcome_message_it'
        ]

        const publicSettings: Record<string, string> = {}
        safeKeys.forEach(key => {
            if (settings[key] !== undefined) publicSettings[key] = settings[key]
        })

        return NextResponse.json({ settings: publicSettings })

    } catch (error) {
        logger.error('[ChatSettings] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const rl = await withRateLimit(request, API_GUARD)
        if (rl.limited) return rl.response!

        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not configured' }, { status: 500 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if owner/admin
        const { data: profile } = await profilesTable()
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'owner' && profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { key, value } = body

        if (!key || value === undefined) {
            return NextResponse.json({ error: 'Key and value required' }, { status: 400 })
        }

        // Upsert setting for this tenant
        const { error } = await chatSettingsTable()
            .upsert({
                tenant_id: tenantId,
                key,
                value: String(value),
                updated_at: new Date().toISOString(),
                updated_by: user.id
            }, { onConflict: 'tenant_id,key' })

        if (error) {
            logger.error('[ChatSettings] Update error:', error)
            return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
        }

        clearSettingsCache(tenantId)
        return NextResponse.json({ success: true, key, value })

    } catch (error) {
        logger.error('[ChatSettings] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
