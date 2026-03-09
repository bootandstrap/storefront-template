/**
 * Type definitions for the Governance Supabase RPCs.
 *
 * These RPCs are SECURITY DEFINER functions on the central BootandStrap Supabase.
 * They are NOT in the auto-generated tenant types because they belong to a
 * different Supabase project (governance hub).
 *
 * Source of truth:
 * - BSWEB supabase/migrations/20260302_governance_rpcs.sql
 *   → get_tenant_governance, log_tenant_error
 * - Webhook RPCs (defined in governance hub migrations)
 *   → claim_webhook_event, mark_webhook_processed, mark_webhook_failed
 *
 * Contract: the storefront only uses RPCs (anon key + SECURITY DEFINER).
 * Direct table access is limited to analytics_events inserts.
 *
 * Keep this file in sync with BSWEB migrations. A contract-drift test
 * validates alignment (see __tests__/governance-rpc-contract.test.ts).
 *
 * @module governance-types
 * @locked 🔴 LOCKED — platform infrastructure, do not modify in tenant repos
 */

// ---------------------------------------------------------------------------
// Governance RPC response types
// ---------------------------------------------------------------------------

/** Response shape from get_tenant_governance() RPC */
export interface GovernanceRpcResponse {
    config: Record<string, unknown> | null
    feature_flags: Record<string, boolean> | null
    plan_limits: Record<string, number> | null
    tenant_status: string | null
}

/** Claim result from claim_webhook_event() RPC */
export type WebhookClaimResult = 'claimed' | 'duplicate' | 'retry' | 'unavailable'

// ---------------------------------------------------------------------------
// GovernanceDatabase type — passed as generic to createClient<T>()
//
// Must match GenericSchema shape:
//   { Tables: Record<string, GenericTable>,
//     Views: Record<string, GenericView>,
//     Functions: Record<string, GenericFunction> }
// ---------------------------------------------------------------------------

export type GovernanceDatabase = {
    public: {
        Tables: {
            analytics_events: {
                Row: {
                    id: string
                    event_type: string
                    metadata: Record<string, unknown> | null
                    tenant_id: string | null
                    user_id: string | null
                    created_at: string
                }
                Insert: {
                    event_type: string
                    metadata?: Record<string, unknown> | null
                    tenant_id?: string | null
                    user_id?: string | null
                }
                Update: Record<string, never>
                Relationships: []
            }
        }
        Views: Record<string, never>
        Functions: {
            get_tenant_governance: {
                Args: { p_tenant_id: string }
                Returns: GovernanceRpcResponse
            }
            log_tenant_error: {
                Args: {
                    p_tenant_id: string
                    p_error_type: string
                    p_error_message: string
                    p_metadata?: string
                }
                Returns: unknown
            }
            claim_webhook_event: {
                Args: {
                    p_event_id: string
                    p_event_type: string
                    p_tenant_id: string | null
                }
                Returns: string
            }
            mark_webhook_processed: {
                Args: { p_event_id: string }
                Returns: unknown
            }
            mark_webhook_failed: {
                Args: {
                    p_event_id: string
                    p_error: string
                }
                Returns: unknown
            }
        }
    }
}
