/**
 * Chat Database Helper
 *
 * Provides a typed Supabase query interface for chat tables.
 * The chatbot tables (chat_settings, chat_usage, chat_logs, chat_daily_stats)
 * are not in the generated Supabase types, so we use typed helper functions
 * to avoid `never` type errors while maintaining type safety at the app level.
 */

import { createAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabaseClient = any

function getDb(): UntypedSupabaseClient {
    return createAdminClient()
}

// ── Query helpers ──────────────────────────────────────────────────────

export function chatSettingsTable() {
    return getDb().from('chat_settings')
}

export function chatUsageTable() {
    return getDb().from('chat_usage')
}

export function chatLogsTable() {
    return getDb().from('chat_logs')
}

export function chatDailyStatsTable() {
    return getDb().from('chat_daily_stats')
}

export function profilesTable() {
    return getDb().from('profiles')
}
