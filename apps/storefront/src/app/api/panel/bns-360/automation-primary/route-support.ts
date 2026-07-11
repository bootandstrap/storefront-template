import 'server-only'

import { clearCachedConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type {
    Bns360AutomationConfig,
    Bns360AutomationConfigUpdate,
    Bns360AutomationPrimaryClient,
} from '@/lib/bns-360/automation-primary-journey'

interface AutomationConfigRow {
    notification_channels: Bns360AutomationConfig['notificationChannels'] | null
    notification_events: Bns360AutomationConfig['notificationEvents'] | null
}

const DEFAULT_AUTOMATION_CONFIG: Bns360AutomationConfig = {
    notificationChannels: {
        webhook: { enabled: false, url: '', secret: '' },
        email: { enabled: true },
    },
    notificationEvents: {
        'order.placed': ['email'],
    },
}

export function createBns360AutomationPrimaryClient(
    tenantId: string
): Bns360AutomationPrimaryClient {
    return {
        async readConfig() {
            return readAutomationConfig(tenantId)
        },

        async updateConfig(updates) {
            await updateAutomationConfig(tenantId, updates)
        },
    }
}

async function readAutomationConfig(tenantId: string): Promise<Bns360AutomationConfig> {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('config')
        .select('notification_channels,notification_events')
        .eq('tenant_id', tenantId)
        .single()

    if (error) {
        throw new Error(`Automation config read failed: ${error.message}`)
    }

    return normalizeAutomationConfig(data as AutomationConfigRow)
}

function normalizeAutomationConfig(config: AutomationConfigRow): Bns360AutomationConfig {
    return {
        notificationChannels: config.notification_channels ?? DEFAULT_AUTOMATION_CONFIG.notificationChannels,
        notificationEvents: config.notification_events ?? DEFAULT_AUTOMATION_CONFIG.notificationEvents,
    }
}

async function updateAutomationConfig(
    tenantId: string,
    updates: Bns360AutomationConfigUpdate
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
        throw new Error(`Automation config lookup failed: ${existingError.message}`)
    }
    if (!existing?.id) {
        throw new Error('Automation config lookup returned no row')
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
        throw new Error('Automation config update affected zero rows')
    }

    clearCachedConfig()
}

function toConfigPayload(updates: Bns360AutomationConfigUpdate): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if ('notificationChannels' in updates) payload.notification_channels = updates.notificationChannels
    if ('notificationEvents' in updates) payload.notification_events = updates.notificationEvents
    return payload
}
