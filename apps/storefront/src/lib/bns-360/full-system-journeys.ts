import { randomUUID } from 'node:crypto'
import type { TenantBackup } from '@/lib/backup/backup-types'

type JourneyStatus = 'verified' | 'blocked'

interface Bns360JourneyInput {
    tenantId: string
    runId?: string
}

interface Bns360JourneyBase {
    status: JourneyStatus
    runId: string
    tenantRef: string
    generatedAt: string
    cleanup: {
        status: 'verified' | 'failed'
    }
    residue: {
        zero: boolean
    }
    error?: string
}

export interface Bns360CheckoutPrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.checkout-primary/v1'
    runtime: {
        cart: {
            created: boolean
            itemAttached: boolean
        }
        paymentCollection: {
            status: JourneyStatus
            providerMode: 'simulator'
            paymentSessionInitialized: boolean
            liveMutation: boolean
        }
        order: {
            completed: boolean
            resultType: 'order'
        }
    }
}

export interface Bns360CustomerAccountPrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.customer-account-primary/v1'
    runtime: {
        customer: {
            canaryCreated: boolean
            authenticated: boolean
        }
        address: {
            created: boolean
            updated: boolean
            deleted: boolean
        }
        orderRead: {
            tenantScoped: boolean
            orderCountReadable: boolean
        }
        crossTenantLeakage: boolean
    }
}

export interface Bns360OrderLifecyclePrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1'
    runtime: {
        orderPlaced: boolean
        paymentCollectionLinked: boolean
        fulfillmentBoundary: JourneyStatus
        cancelBoundary: JourneyStatus
        refundReturnBoundary: JourneyStatus
        subscriberEvents: {
            orderPlaced: boolean
            analyticsRecorded: boolean
        }
    }
}

export interface Bns360BackupRestorePrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1'
    runtime: {
        backup: {
            metadataReadable: boolean
            payloadRedacted: boolean
        }
        restoreDryRun: {
            safe: boolean
            mutation: boolean
        }
    }
}

function resolveRunId(prefix: string, runId?: string): string {
    return runId ?? `${prefix}-${Date.now()}-${randomUUID()}`
}

function baseResult(input: Bns360JourneyInput, prefix: string): Omit<Bns360JourneyBase, 'status'> {
    return {
        runId: resolveRunId(prefix, input.runId),
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        cleanup: { status: 'verified' },
        residue: { zero: true },
    }
}

function blockedBaseResult(input: Bns360JourneyInput, prefix: string, journeyName: string): Bns360JourneyBase {
    return {
        status: 'blocked',
        ...baseResult(input, prefix),
        cleanup: { status: 'failed' },
        residue: { zero: true },
        error: `${journeyName} is not wired to a runtime runner yet`,
    }
}

function buildBlockedBackupRestoreResult(
    input: Bns360JourneyInput,
    error: string,
    cleanupStatus: Bns360JourneyBase['cleanup']['status'] = 'failed',
    residueZero = true,
): Bns360BackupRestorePrimaryJourneyResult {
    return {
        schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1',
        status: 'blocked',
        ...baseResult(input, 'bns360-backup-restore'),
        cleanup: { status: cleanupStatus },
        residue: { zero: residueZero },
        error,
        runtime: {
            backup: {
                metadataReadable: false,
                payloadRedacted: true,
            },
            restoreDryRun: {
                safe: false,
                mutation: false,
            },
        },
    }
}

function hasReadableBackupMetadata(backup: TenantBackup | null, input: Bns360JourneyInput, tenantSlug: string): boolean {
    return Boolean(
        backup &&
        backup.version === '1.0' &&
        backup.tenant_id === input.tenantId &&
        backup.tenant_slug === tenantSlug &&
        backup.type === 'full' &&
        backup.stats &&
        backup.data &&
        Array.isArray(backup.data.products) &&
        Array.isArray(backup.data.orders) &&
        Array.isArray(backup.data.customers) &&
        Array.isArray(backup.data.categories) &&
        Array.isArray(backup.data.promotions) &&
        Array.isArray(backup.data.inventory)
    )
}

function redactError(error: unknown): string {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
    if (message) {
        return message
            .replace(/(client_secret|password|token|secret|service[_-]?role[_-]?key)=?[^,\s]*/gi, '$1=[redacted]')
            .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_]+/g, '[redacted_key]')
    }
    return 'Unknown backup restore certification error'
}

export async function runBns360CheckoutPrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360CheckoutPrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.checkout-primary/v1',
        ...blockedBaseResult(input, 'bns360-checkout', 'BNS 360 checkout primary journey'),
        runtime: {
            cart: {
                created: false,
                itemAttached: false,
            },
            paymentCollection: {
                status: 'blocked',
                providerMode: 'simulator',
                paymentSessionInitialized: false,
                liveMutation: false,
            },
            order: {
                completed: false,
                resultType: 'order',
            },
        },
    }
}

export async function runBns360CustomerAccountPrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360CustomerAccountPrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
        ...blockedBaseResult(input, 'bns360-customer-account', 'BNS 360 customer account primary journey'),
        runtime: {
            customer: {
                canaryCreated: false,
                authenticated: false,
            },
            address: {
                created: false,
                updated: false,
                deleted: false,
            },
            orderRead: {
                tenantScoped: false,
                orderCountReadable: false,
            },
            crossTenantLeakage: false,
        },
    }
}

export async function runBns360OrderLifecyclePrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360OrderLifecyclePrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1',
        ...blockedBaseResult(input, 'bns360-order-lifecycle', 'BNS 360 order lifecycle primary journey'),
        runtime: {
            orderPlaced: false,
            paymentCollectionLinked: false,
            fulfillmentBoundary: 'blocked',
            cancelBoundary: 'blocked',
            refundReturnBoundary: 'blocked',
            subscriberEvents: {
                orderPlaced: false,
                analyticsRecorded: false,
            },
        },
    }
}

export async function runBns360BackupRestorePrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360BackupRestorePrimaryJourneyResult> {
    let backupKey: string | undefined

    try {
        const [{ getTenantSlug }, { getTenantMedusaScope }, { executeFullBackup }, { downloadBackup }, { createStorageAdminClient }] =
            await Promise.all([
                import('@/lib/backup/tenant-slug'),
                import('@/lib/medusa/tenant-scope'),
                import('@/lib/backup/backup-executor'),
                import('@/lib/backup/backup-restore'),
                import('@/lib/supabase/storage-admin'),
            ])

        const [tenantSlug, scope] = await Promise.all([
            getTenantSlug(input.tenantId),
            getTenantMedusaScope(input.tenantId),
        ])

        if (!scope) {
            return buildBlockedBackupRestoreResult(
                input,
                'Missing Medusa tenant scope mapping for backup restore certification'
            )
        }

        const backupResult = await executeFullBackup(input.tenantId, tenantSlug, scope)
        backupKey = backupResult.backup_key

        if (!backupResult.success || !backupKey) {
            return buildBlockedBackupRestoreResult(
                input,
                backupResult.error ? `Backup failed: ${backupResult.error}` : 'Backup failed without a storage key'
            )
        }

        const backup = await downloadBackup(backupKey)
        const metadataReadable = hasReadableBackupMetadata(backup, input, tenantSlug)

        if (!metadataReadable) {
            const supabase = createStorageAdminClient()
            const { error: cleanupError } = await supabase.storage.from('tenant-backups').remove([backupKey])

            return buildBlockedBackupRestoreResult(
                input,
                'Backup metadata failed restore dry-run validation',
                cleanupError ? 'failed' : 'verified',
                !cleanupError
            )
        }

        const supabase = createStorageAdminClient()
        const { error: cleanupError } = await supabase.storage.from('tenant-backups').remove([backupKey])

        if (cleanupError) {
            return buildBlockedBackupRestoreResult(
                input,
                `Backup cleanup failed: ${cleanupError.message}`,
                'failed',
                false,
            )
        }

        return {
            schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1',
            status: 'verified',
            ...baseResult(input, 'bns360-backup-restore'),
            runtime: {
                backup: {
                    metadataReadable: true,
                    payloadRedacted: true,
                },
                restoreDryRun: {
                    safe: true,
                    mutation: false,
                },
            },
        }
    } catch (error) {
        return buildBlockedBackupRestoreResult(input, redactError(error), backupKey ? 'failed' : 'verified', !backupKey)
    }
}
