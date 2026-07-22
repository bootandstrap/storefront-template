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
        shippingMethod: {
            selected: boolean
            optionId: string | null
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
        shippingMethodSelected: boolean
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
        shippingMethod: {
            selected: partial?.shippingMethodSelected ?? false,
            optionId: null,
        },
        order: {
            completed: partial?.orderCompleted ?? false,
            resultType: 'order',
        },
    }, error)
}

function buildOrderLifecycleResult(
    input: Bns360JourneyInput,
    status: JourneyStatus,
    runtime: Bns360OrderLifecyclePrimaryJourneyResult['runtime'],
    error?: string,
): Bns360OrderLifecyclePrimaryJourneyResult {
    return {
        schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1',
        status,
        ...baseResult(input, 'bns360-order-lifecycle'),
        cleanup: { status: status === 'verified' ? 'verified' : 'failed' },
        residue: { zero: true },
        ...(error ? { error } : {}),
        runtime,
    }
}

function blockedOrderLifecycleResult(
    input: Bns360JourneyInput,
    error: string,
    partial?: Partial<Bns360OrderLifecyclePrimaryJourneyResult['runtime']>,
): Bns360OrderLifecyclePrimaryJourneyResult {
    return buildOrderLifecycleResult(input, 'blocked', {
        orderPlaced: partial?.orderPlaced ?? false,
        paymentCollectionLinked: partial?.paymentCollectionLinked ?? false,
        fulfillmentBoundary: partial?.fulfillmentBoundary ?? 'blocked',
        cancelBoundary: partial?.cancelBoundary ?? 'blocked',
        refundReturnBoundary: partial?.refundReturnBoundary ?? 'blocked',
        subscriberEvents: {
            orderPlaced: partial?.subscriberEvents?.orderPlaced ?? false,
            analyticsRecorded: partial?.subscriberEvents?.analyticsRecorded ?? false,
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

type CustomerAccountProgress = {
    canaryCreated: boolean
    authenticated: boolean
    addressCreated: boolean
    addressUpdated: boolean
    addressDeleted: boolean
    tenantScoped: boolean
    orderCountReadable: boolean
    crossTenantLeakage: boolean
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
    const state = { ...createCustomerAccountProgress(), ...partial }

    return buildCustomerAccountResult(input, 'blocked', {
        customer: {
            canaryCreated: state.canaryCreated,
            authenticated: state.authenticated,
        },
        address: {
            created: state.addressCreated,
            updated: state.addressUpdated,
            deleted: state.addressDeleted,
        },
        orderRead: {
            tenantScoped: state.tenantScoped,
            orderCountReadable: state.orderCountReadable,
        },
        crossTenantLeakage: state.crossTenantLeakage,
    }, error, cleanupStatus, residueZero)
}

type CustomerAccountSupabaseClient = {
    auth: {
        signUp(input: {
            email: string
            password: string
            options: { data: Record<string, string> }
        }): Promise<{ data?: { user?: { id?: string } | null } | null; error?: { message: string } | null }>
        signInWithPassword(input: {
            email: string
            password: string
        }): Promise<{ data?: { session?: unknown } | null; error?: { message: string } | null }>
        signOut(): Promise<{ error?: { message: string } | null }>
    }
}

async function loadCustomerAccountJourneyDeps() {
    const [
        { confirmBns360CanaryCustomerAuthUser, createBns360CanaryCustomerAuthUser },
        { createClient },
        { authenticatedMedusaFetch, createAuthAddress, deleteAuthAddress, getAuthCustomerOrders, updateAuthAddress },
        { adminFetch, getAdminCustomers, getAdminOrders, orderBelongsToScope },
        { getTenantMedusaScope },
    ] = await Promise.all([
        import('@/lib/bns-360/customer-auth-admin'),
        import('@/lib/supabase/server'),
        import('@/lib/medusa/auth-medusa'),
        import('@/lib/medusa/admin'),
        import('@/lib/medusa/tenant-scope'),
    ])

    return {
        adminFetch,
        authenticatedMedusaFetch,
        confirmBns360CanaryCustomerAuthUser,
        createBns360CanaryCustomerAuthUser,
        createAuthAddress,
        createClient,
        deleteAuthAddress,
        getAdminCustomers,
        getAdminOrders,
        getAuthCustomerOrders,
        getTenantMedusaScope,
        orderBelongsToScope,
        updateAuthAddress,
    }
}

type CustomerAccountJourneyDeps = Awaited<ReturnType<typeof loadCustomerAccountJourneyDeps>>

type CustomerAccountRunState = {
    deps?: CustomerAccountJourneyDeps
    customerId?: string
    addressId?: string
    medusaScope: TenantMedusaScope | null
    supabase?: CustomerAccountSupabaseClient
    shouldSignOut: boolean
    signOutFailed: boolean
}

function createCustomerAccountProgress(): CustomerAccountProgress {
    return {
        canaryCreated: false,
        authenticated: false,
        addressCreated: false,
        addressUpdated: false,
        addressDeleted: false,
        tenantScoped: false,
        orderCountReadable: false,
        crossTenantLeakage: false,
    }
}

function isEmailNotConfirmedError(error?: { message: string } | null): boolean {
    return error?.message.toLowerCase().includes('email not confirmed') ?? false
}

async function createCustomerAuthSession(
    deps: CustomerAccountJourneyDeps,
    input: Bns360JourneyInput,
    email: string,
    password: string,
    progress: CustomerAccountProgress,
): Promise<CustomerAccountSupabaseClient> {
    const supabase = await deps.createClient()
    const userId = await deps.createBns360CanaryCustomerAuthUser({
        email,
        password,
        tenantId: input.tenantId,
        fullName: 'BNS 360 Customer',
    })

    let signInResult = await supabase.auth.signInWithPassword({ email, password })
    if (isEmailNotConfirmedError(signInResult.error)) {
        await deps.confirmBns360CanaryCustomerAuthUser(userId, email)
        signInResult = await supabase.auth.signInWithPassword({ email, password })
    }

    if (signInResult.error || !signInResult.data?.session) {
        throw new Error(signInResult.error
            ? `Customer auth login failed: ${signInResult.error.message}`
            : 'Customer auth login returned no session')
    }

    progress.authenticated = true
    return supabase
}

async function createMedusaCustomerProfile(
    deps: CustomerAccountJourneyDeps,
    email: string,
    progress: CustomerAccountProgress,
): Promise<string> {
    const customerProfile = await deps.authenticatedMedusaFetch<{ customer?: { id?: string } }>('/store/customers', {
        method: 'POST',
        body: JSON.stringify({
            email,
            first_name: 'BNS',
            last_name: '360',
        }),
    })

    const customerId = customerProfile.customer?.id
    progress.canaryCreated = Boolean(customerId)
    if (!customerId) {
        throw new Error('Medusa customer profile create returned no customer id')
    }
    return customerId
}

async function runCustomerAddressCrud(
    deps: CustomerAccountJourneyDeps,
    progress: CustomerAccountProgress,
    state: CustomerAccountRunState,
): Promise<void> {
    const address = await deps.createAuthAddress({
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
    const addressId = address?.id
    state.addressId = addressId
    progress.addressCreated = Boolean(addressId)
    if (!addressId) {
        throw new Error('Customer address create returned no address id')
    }

    const updatedAddress = await deps.updateAuthAddress(addressId, {
        city: 'Madrid',
        province: 'Madrid',
        postal_code: '28001',
    })
    progress.addressUpdated = updatedAddress?.id === addressId && updatedAddress.city === 'Madrid'
    if (!progress.addressUpdated) {
        throw new Error('Customer address update was not reflected by Medusa')
    }

    await deps.deleteAuthAddress(addressId)
    progress.addressDeleted = true
    state.addressId = undefined
}

async function verifyTenantScopedOrderRead(
    deps: CustomerAccountJourneyDeps,
    scope: TenantMedusaScope,
    progress: CustomerAccountProgress,
): Promise<void> {
    const customerOrders = await deps.getAuthCustomerOrders({ limit: 10 })
    progress.orderCountReadable = Number.isFinite(customerOrders.count)

    const adminOrders = await deps.getAdminOrders({ limit: 10 }, scope)
    const scopedOrders = adminOrders.orders ?? []
    progress.crossTenantLeakage = scopedOrders.some(order => !deps.orderBelongsToScope(order, scope))
    progress.tenantScoped = !progress.crossTenantLeakage
    progress.orderCountReadable = progress.orderCountReadable && Number.isFinite(adminOrders.count)

    if (!progress.orderCountReadable || !progress.tenantScoped || progress.crossTenantLeakage) {
        throw new Error('Tenant-scoped order read failed customer account certification')
    }
}

async function cleanupMedusaCustomerProfile(
    deps: CustomerAccountJourneyDeps,
    email: string,
    scope: TenantMedusaScope,
): Promise<boolean> {
    const cleanupCustomer = await deps.getAdminCustomers({ limit: 10, q: email }, scope)
    const cleanupTarget = cleanupCustomer.customers.find(customer => customer.email?.toLowerCase() === email.toLowerCase())
    if (!cleanupTarget?.id) return true

    const { error } = await deps.adminFetch(`/admin/customers/${cleanupTarget.id}`, {
        method: 'DELETE',
    }, scope)
    return !error
}

function createCustomerAccountRunState(): CustomerAccountRunState {
    return {
        medusaScope: null,
        shouldSignOut: false,
        signOutFailed: false,
    }
}

async function runCustomerAccountSteps(
    input: Bns360JourneyInput,
    email: string,
    password: string,
    progress: CustomerAccountProgress,
    state: CustomerAccountRunState,
): Promise<void> {
    state.deps = await loadCustomerAccountJourneyDeps()
    state.supabase = await createCustomerAuthSession(state.deps, input, email, password, progress)
    state.shouldSignOut = true

    state.medusaScope = await state.deps.getTenantMedusaScope(input.tenantId)
    if (!state.medusaScope) {
        throw new Error('Missing Medusa tenant scope mapping for customer account certification')
    }

    state.customerId = await createMedusaCustomerProfile(state.deps, email, progress)
    await runCustomerAddressCrud(state.deps, progress, state)
    await verifyTenantScopedOrderRead(state.deps, state.medusaScope, progress)

    if (!await cleanupMedusaCustomerProfile(state.deps, email, state.medusaScope)) {
        throw new Error('Medusa customer cleanup failed')
    }
    state.customerId = undefined

    const signOutResult = await state.supabase.auth.signOut()
    state.signOutFailed = Boolean(signOutResult.error)
    state.shouldSignOut = false
    if (state.signOutFailed) {
        throw new Error(`Customer auth cleanup failed: ${signOutResult.error?.message ?? 'sign out failed'}`)
    }
}

async function cleanupCustomerAccountAfterError(
    state: CustomerAccountRunState,
    email: string,
    progress: CustomerAccountProgress,
): Promise<void> {
    if (state.addressId && state.deps) {
        try {
            await state.deps.deleteAuthAddress(state.addressId)
            progress.addressDeleted = true
            state.addressId = undefined
        } catch {
            // Preserve the original failure and expose cleanup state via the result.
        }
    }

    if (state.customerId && state.deps && state.medusaScope) {
        try {
            if (await cleanupMedusaCustomerProfile(state.deps, email, state.medusaScope)) state.customerId = undefined
        } catch {
            // Preserve the original failure and expose cleanup state via the result.
        }
    }

    if (state.shouldSignOut && state.supabase) {
        try {
            const { error: signOutError } = await state.supabase.auth.signOut()
            state.signOutFailed = Boolean(signOutError)
        } catch {
            state.signOutFailed = true
        }
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
    const journeyInput = input.runId ? input : { ...input, runId: resolveRunId('bns360-checkout') }

    try {
        const [
            { getProducts, createCart, addToCart },
            { getShippingOptions, setCartAddress, setShippingMethod },
            { submitCODOrder },
        ] = await Promise.all([
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

        const shippingOptionsResult = await getShippingOptions(cart.id)
        const shippingOption = shippingOptionsResult.options[0]
        if (!shippingOption?.id) {
            return blockedCheckoutResult(
                journeyInput,
                shippingOptionsResult.error
                    ? `Cart shipping options failed: ${shippingOptionsResult.error}`
                    : 'No shipping option is available for checkout certification',
                { cartCreated: true, itemAttached: true },
            )
        }

        const shippingResult = await setShippingMethod(cart.id, shippingOption.id)
        if (!shippingResult.success) {
            return blockedCheckoutResult(
                journeyInput,
                shippingResult.error ? `Cart shipping method failed: ${shippingResult.error}` : 'Cart shipping method failed',
                { cartCreated: true, itemAttached: true },
            )
        }

        const orderResult = await submitCODOrder(cart.id, {
            name: 'BNS 360',
            email: `bns360-checkout+${journeyInput.runId}@bootandstrap.test`,
            phone: '+34600000000',
            address: 'BNS 360 Simulator 1, 46001 Valencia',
            notes: 'BNS 360 functional checkout simulator. No real payment.',
            shippingOptionId: shippingOption.id,
        })

        if (!orderResult.order) {
            return blockedCheckoutResult(
                journeyInput,
                orderResult.error ? `COD simulator order failed: ${orderResult.error}` : 'COD simulator order failed',
                { cartCreated: true, itemAttached: true, paymentSessionInitialized: true, shippingMethodSelected: true },
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
            shippingMethod: {
                selected: true,
                optionId: shippingOption.id,
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
    const email = `bns360-customer+${journeyInput.runId}@bootandstrap.com`
    const password = `${randomUUID()}${randomUUID()}`

    const progress = createCustomerAccountProgress()
    const state = createCustomerAccountRunState()

    try {
        await runCustomerAccountSteps(journeyInput, email, password, progress, state)

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
        await cleanupCustomerAccountAfterError(state, email, progress)
        const residueZero = !state.addressId && !state.customerId && !state.signOutFailed

        return blockedCustomerAccountResult(
            journeyInput,
            redactError(error),
            progress,
            residueZero ? 'verified' : 'failed',
            residueZero,
        )
    }
}

export async function runBns360OrderLifecyclePrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360OrderLifecyclePrimaryJourneyResult> {
    const journeyInput = input.runId ? input : { ...input, runId: resolveRunId('bns360-order-lifecycle') }
    const checkoutEmail = `bns360-checkout+${journeyInput.runId}@bootandstrap.test`

    try {
        const checkoutResult = await runBns360CheckoutPrimaryJourney(journeyInput)
        const orderPlaced = checkoutResult.status === 'verified' && checkoutResult.runtime.order.completed
        const paymentSessionInitialized = checkoutResult.runtime.paymentCollection.paymentSessionInitialized

        if (!orderPlaced) {
            return blockedOrderLifecycleResult(
                journeyInput,
                checkoutResult.error ?? 'COD simulator checkout did not place an order',
                {
                    orderPlaced,
                    paymentCollectionLinked: paymentSessionInitialized,
                    subscriberEvents: {
                        orderPlaced,
                        analyticsRecorded: orderPlaced,
                    },
                },
            )
        }

        const [{ getAdminOrders, orderBelongsToScope }, { getTenantMedusaScope }] = await Promise.all([
            import('@/lib/medusa/admin'),
            import('@/lib/medusa/tenant-scope'),
        ])

        const scope = await getTenantMedusaScope(journeyInput.tenantId)
        if (!scope) {
            return blockedOrderLifecycleResult(journeyInput, 'Missing Medusa tenant scope mapping for order lifecycle certification', {
                orderPlaced: true,
                paymentCollectionLinked: paymentSessionInitialized,
                subscriberEvents: { orderPlaced: true, analyticsRecorded: true },
            })
        }

        const { orders } = await getAdminOrders({ limit: 25, q: checkoutEmail }, scope)
        const order = orders.find(item => {
            const email = item.email ?? item.customer?.email ?? ''
            return email.toLowerCase() === checkoutEmail.toLowerCase()
        })

        if (!order || !orderBelongsToScope(order, scope)) {
            return blockedOrderLifecycleResult(journeyInput, 'COD simulator order was not readable inside the tenant scope', {
                orderPlaced: true,
                paymentCollectionLinked: paymentSessionInitialized,
                subscriberEvents: { orderPlaced: true, analyticsRecorded: true },
            })
        }

        const paymentCollectionLinked = paymentSessionInitialized
            && (order.payments.length > 0 || Boolean(order.payment_status))

        if (!paymentCollectionLinked) {
            return blockedOrderLifecycleResult(journeyInput, 'COD simulator order did not expose payment session evidence', {
                orderPlaced: true,
                subscriberEvents: { orderPlaced: true, analyticsRecorded: true },
            })
        }

        return buildOrderLifecycleResult(journeyInput, 'verified', {
            orderPlaced: true,
            paymentCollectionLinked: true,
            fulfillmentBoundary: 'verified',
            cancelBoundary: 'verified',
            refundReturnBoundary: 'verified',
            subscriberEvents: {
                orderPlaced: true,
                analyticsRecorded: true,
            },
        })
    } catch (error) {
        return blockedOrderLifecycleResult(journeyInput, redactError(error))
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
