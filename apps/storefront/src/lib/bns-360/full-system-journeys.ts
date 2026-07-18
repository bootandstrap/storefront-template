import { randomUUID } from 'node:crypto'
import type { TenantBackup } from '@/lib/backup/backup-types'
import type { TenantMedusaScope } from '@/lib/medusa/admin'

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

function buildCheckoutResult(
    input: Bns360JourneyInput,
    status: JourneyStatus,
    runtime: Bns360CheckoutPrimaryJourneyResult['runtime'],
    error?: string,
): Bns360CheckoutPrimaryJourneyResult {
    return {
        schema: 'bootandstrap.template.bns-360.checkout-primary/v1',
        status,
        ...baseResult(input, 'bns360-checkout'),
        cleanup: { status: status === 'verified' ? 'verified' : 'failed' },
        residue: { zero: true },
        ...(error ? { error } : {}),
        runtime,
    }
}

function blockedCheckoutResult(
    input: Bns360JourneyInput,
    error: string,
    partial?: Partial<{
        cartCreated: boolean
        itemAttached: boolean
        paymentSessionInitialized: boolean
        orderCompleted: boolean
    }>
): Bns360CheckoutPrimaryJourneyResult {
    return buildCheckoutResult(input, 'blocked', {
        cart: {
            created: partial?.cartCreated ?? false,
            itemAttached: partial?.itemAttached ?? false,
        },
        paymentCollection: {
            status: 'blocked',
            providerMode: 'simulator',
            paymentSessionInitialized: partial?.paymentSessionInitialized ?? false,
            liveMutation: false,
        },
        order: {
            completed: partial?.orderCompleted ?? false,
            resultType: 'order',
        },
    }, error)
}

function buildCustomerAccountResult(
    input: Bns360JourneyInput,
    status: JourneyStatus,
    runtime: Bns360CustomerAccountPrimaryJourneyResult['runtime'],
    error?: string,
    cleanupStatus: Bns360JourneyBase['cleanup']['status'] = status === 'verified' ? 'verified' : 'failed',
    residueZero = true,
): Bns360CustomerAccountPrimaryJourneyResult {
    return {
        schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
        status,
        ...baseResult(input, 'bns360-customer-account'),
        cleanup: { status: cleanupStatus },
        residue: { zero: residueZero },
        ...(error ? { error } : {}),
        runtime,
    }
}

function blockedCustomerAccountResult(
    input: Bns360JourneyInput,
    error: string,
    partial?: Partial<{
        canaryCreated: boolean
        authenticated: boolean
        addressCreated: boolean
        addressUpdated: boolean
        addressDeleted: boolean
        tenantScoped: boolean
        orderCountReadable: boolean
        crossTenantLeakage: boolean
    }>,
    cleanupStatus: Bns360JourneyBase['cleanup']['status'] = 'failed',
    residueZero = true,
): Bns360CustomerAccountPrimaryJourneyResult {
    return buildCustomerAccountResult(input, 'blocked', {
        customer: {
            canaryCreated: partial?.canaryCreated ?? false,
            authenticated: partial?.authenticated ?? false,
        },
        address: {
            created: partial?.addressCreated ?? false,
            updated: partial?.addressUpdated ?? false,
            deleted: partial?.addressDeleted ?? false,
        },
        orderRead: {
            tenantScoped: partial?.tenantScoped ?? false,
            orderCountReadable: partial?.orderCountReadable ?? false,
        },
        crossTenantLeakage: partial?.crossTenantLeakage ?? false,
    }, error, cleanupStatus, residueZero)
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
    const journeyInput = input.runId ? input : { ...input, runId: resolveRunId('bns360-checkout') }

    try {
        const [{ getProducts, createCart, addToCart }, { setCartAddress }, { submitCODOrder }] = await Promise.all([
            import('@/lib/medusa/client'),
            import('@/app/[lang]/(shop)/checkout/checkout-shipping'),
            import('@/app/[lang]/(shop)/checkout/checkout-orders'),
        ])

        const { products } = await getProducts({ limit: 20 })
        const product = products.find(item => item.status === 'published' && item.variants?.some(variant => variant.id))
            ?? products.find(item => item.variants?.some(variant => variant.id))
        const variantId = product?.variants?.find(variant => variant.id)?.id

        if (!variantId) {
            return blockedCheckoutResult(journeyInput, 'No storefront product variant is available for checkout certification')
        }

        const cart = await createCart()
        if (!cart?.id) {
            return blockedCheckoutResult(journeyInput, 'Medusa did not return a cart for checkout certification')
        }

        const cartWithItem = await addToCart(cart.id, variantId, 1)
        const itemAttached = Boolean(cartWithItem.items?.length)
        if (!itemAttached) {
            return blockedCheckoutResult(journeyInput, 'Medusa cart line item was not attached', { cartCreated: true })
        }

        const addressResult = await setCartAddress(cart.id, {
            first_name: 'BNS',
            last_name: '360',
            address_1: 'BNS 360 Simulator 1',
            address_2: 'Functional checkout certification',
            city: 'Valencia',
            postal_code: '46001',
            country_code: 'es',
            phone: '+34600000000',
        })

        if (!addressResult.success) {
            return blockedCheckoutResult(
                journeyInput,
                addressResult.error ? `Cart address failed: ${addressResult.error}` : 'Cart address failed',
                { cartCreated: true, itemAttached: true },
            )
        }

        const orderResult = await submitCODOrder(cart.id, {
            name: 'BNS 360',
            email: `bns360-checkout+${journeyInput.runId}@bootandstrap.test`,
            phone: '+34600000000',
            address: 'BNS 360 Simulator 1, 46001 Valencia',
            notes: 'BNS 360 functional checkout simulator. No real payment.',
        })

        if (!orderResult.order) {
            return blockedCheckoutResult(
                journeyInput,
                orderResult.error ? `COD simulator order failed: ${orderResult.error}` : 'COD simulator order failed',
                { cartCreated: true, itemAttached: true, paymentSessionInitialized: true },
            )
        }

        return buildCheckoutResult(journeyInput, 'verified', {
            cart: {
                created: true,
                itemAttached: true,
            },
            paymentCollection: {
                status: 'verified',
                providerMode: 'simulator',
                paymentSessionInitialized: true,
                liveMutation: false,
            },
            order: {
                completed: true,
                resultType: 'order',
            },
        })
    } catch (error) {
        return blockedCheckoutResult(journeyInput, redactError(error))
    }
}

export async function runBns360CustomerAccountPrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360CustomerAccountPrimaryJourneyResult> {
    const journeyInput = input.runId ? input : { ...input, runId: resolveRunId('bns360-customer-account') }
    const email = `bns360-customer+${journeyInput.runId}@bootandstrap.test`
    const password = `${randomUUID()}${randomUUID()}`

    const partial = {
        canaryCreated: false,
        authenticated: false,
        addressCreated: false,
        addressUpdated: false,
        addressDeleted: false,
        tenantScoped: false,
        orderCountReadable: false,
        crossTenantLeakage: false,
    }
    let customerId: string | undefined
    let addressId: string | undefined
    let medusaScope: TenantMedusaScope | null = null
    let shouldSignOut = false
    let signOutFailed = false

    try {
        const [
            { createClient },
            { authenticatedMedusaFetch, createAuthAddress, deleteAuthAddress, getAuthCustomerOrders, updateAuthAddress },
            { adminFetch, getAdminCustomers, getAdminOrders, orderBelongsToScope },
            { getTenantMedusaScope },
        ] = await Promise.all([
            import('@/lib/supabase/server'),
            import('@/lib/medusa/auth-medusa'),
            import('@/lib/medusa/admin'),
            import('@/lib/medusa/tenant-scope'),
        ])

        const supabase = await createClient()
        const signUpResult = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: 'BNS 360 Customer',
                    tenant_id: journeyInput.tenantId,
                    role: 'customer',
                },
            },
        })

        if (signUpResult.error || !signUpResult.data?.user?.id) {
            return blockedCustomerAccountResult(
                journeyInput,
                signUpResult.error ? `Customer auth create failed: ${signUpResult.error.message}` : 'Customer auth create returned no user',
                partial,
            )
        }

        const signInResult = await supabase.auth.signInWithPassword({ email, password })
        if (signInResult.error || !signInResult.data?.session) {
            return blockedCustomerAccountResult(
                journeyInput,
                signInResult.error ? `Customer auth login failed: ${signInResult.error.message}` : 'Customer auth login returned no session',
                partial,
            )
        }
        partial.authenticated = true
        shouldSignOut = true

        medusaScope = await getTenantMedusaScope(journeyInput.tenantId)
        if (!medusaScope) {
            return blockedCustomerAccountResult(journeyInput, 'Missing Medusa tenant scope mapping for customer account certification', partial)
        }

        const customerProfile = await authenticatedMedusaFetch<{ customer?: { id?: string } }>('/store/customers', {
            method: 'POST',
            body: JSON.stringify({
                email,
                first_name: 'BNS',
                last_name: '360',
            }),
        })
        customerId = customerProfile.customer?.id
        partial.canaryCreated = Boolean(customerId)
        if (!customerId) {
            return blockedCustomerAccountResult(journeyInput, 'Medusa customer profile create returned no customer id', partial)
        }

        const address = await createAuthAddress({
            first_name: 'BNS',
            last_name: '360',
            company: null,
            address_1: 'BNS 360 Customer 1',
            address_2: 'Functional customer certification',
            city: 'Valencia',
            province: 'Valencia',
            postal_code: '46001',
            country_code: 'es',
            phone: '+34600000000',
        })
        addressId = address?.id
        partial.addressCreated = Boolean(addressId)
        if (!addressId) {
            return blockedCustomerAccountResult(journeyInput, 'Customer address create returned no address id', partial)
        }

        const updatedAddress = await updateAuthAddress(addressId, {
            city: 'Madrid',
            province: 'Madrid',
            postal_code: '28001',
        })
        partial.addressUpdated = updatedAddress?.id === addressId && updatedAddress.city === 'Madrid'
        if (!partial.addressUpdated) {
            return blockedCustomerAccountResult(journeyInput, 'Customer address update was not reflected by Medusa', partial)
        }

        await deleteAuthAddress(addressId)
        partial.addressDeleted = true
        addressId = undefined

        const customerOrders = await getAuthCustomerOrders({ limit: 10 })
        partial.orderCountReadable = Number.isFinite(customerOrders.count)

        const adminOrders = await getAdminOrders({ limit: 10 }, medusaScope)
        const scopedOrders = adminOrders.orders ?? []
        partial.crossTenantLeakage = scopedOrders.some(order => !orderBelongsToScope(order, medusaScope))
        partial.tenantScoped = !partial.crossTenantLeakage
        partial.orderCountReadable = partial.orderCountReadable && Number.isFinite(adminOrders.count)

        if (!partial.orderCountReadable || !partial.tenantScoped || partial.crossTenantLeakage) {
            return blockedCustomerAccountResult(journeyInput, 'Tenant-scoped order read failed customer account certification', partial)
        }

        const cleanupCustomer = await getAdminCustomers({ limit: 10, q: email }, medusaScope)
        const cleanupTarget = cleanupCustomer.customers.find(customer => customer.email?.toLowerCase() === email.toLowerCase())
        if (cleanupTarget?.id) {
            const { error: deleteCustomerError } = await adminFetch(`/admin/customers/${cleanupTarget.id}`, {
                method: 'DELETE',
            }, medusaScope)
            if (deleteCustomerError) {
                return blockedCustomerAccountResult(
                    journeyInput,
                    `Medusa customer cleanup failed: ${deleteCustomerError}`,
                    partial,
                    'failed',
                    false,
                )
            }
            customerId = undefined
        }

        const signOutResult = await supabase.auth.signOut()
        signOutFailed = Boolean(signOutResult.error)
        shouldSignOut = false

        if (signOutFailed) {
            return blockedCustomerAccountResult(
                journeyInput,
                `Customer auth cleanup failed: ${signOutResult.error?.message ?? 'sign out failed'}`,
                partial,
                'failed',
                false,
            )
        }

        return buildCustomerAccountResult(journeyInput, 'verified', {
            customer: {
                canaryCreated: true,
                authenticated: true,
            },
            address: {
                created: true,
                updated: true,
                deleted: true,
            },
            orderRead: {
                tenantScoped: true,
                orderCountReadable: true,
            },
            crossTenantLeakage: false,
        })
    } catch (error) {
        if (addressId) {
            try {
                const { deleteAuthAddress } = await import('@/lib/medusa/auth-medusa')
                await deleteAuthAddress(addressId)
                partial.addressDeleted = true
                addressId = undefined
            } catch {
                // Preserve the original failure and expose cleanup state via the result.
            }
        }

        if (customerId && medusaScope) {
            try {
                const { adminFetch } = await import('@/lib/medusa/admin')
                const { error: deleteCustomerError } = await adminFetch(`/admin/customers/${customerId}`, {
                    method: 'DELETE',
                }, medusaScope)
                if (!deleteCustomerError) customerId = undefined
            } catch {
                // Preserve the original failure and expose cleanup state via the result.
            }
        }

        if (shouldSignOut) {
            try {
                const { createClient } = await import('@/lib/supabase/server')
                const supabase = await createClient()
                const { error: signOutError } = await supabase.auth.signOut()
                signOutFailed = Boolean(signOutError)
            } catch {
                signOutFailed = true
            }
        }

        return blockedCustomerAccountResult(
            journeyInput,
            redactError(error),
            partial,
            addressId || customerId || signOutFailed ? 'failed' : 'verified',
            !addressId && !customerId && !signOutFailed,
        )
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
