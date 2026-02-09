import {
    AbstractAuthModuleProvider,
} from "@medusajs/framework/utils"
import type {
    AuthIdentityProviderService,
    AuthenticationInput,
    AuthenticationResponse,
    Logger,
} from "@medusajs/framework/types"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

type InjectedDependencies = {
    logger: Logger
}

type SupabaseAuthOptions = {
    supabaseUrl: string
    supabaseServiceRoleKey: string
}

/**
 * Supabase Auth Provider for Medusa v2.
 * 
 * Validates Supabase JWTs and creates/retrieves Medusa AuthIdentities
 * linked to the Supabase user ID. This is the bridge between 
 * Supabase Auth (customer-facing) and Medusa Auth (commerce engine).
 * 
 * Flow:
 * 1. Customer signs in via Supabase Auth on the storefront
 * 2. Storefront sends Supabase JWT to Medusa API
 * 3. This provider validates the JWT via supabase.auth.getUser()
 * 4. Returns/creates a Medusa AuthIdentity linked to the Supabase user_id
 */
class SupabaseAuthProviderService extends AbstractAuthModuleProvider {
    static identifier = "supabase"
    static DISPLAY_NAME = "Supabase Auth"

    protected logger_: Logger
    protected options_: SupabaseAuthOptions
    protected client_: SupabaseClient

    constructor(
        { logger }: InjectedDependencies,
        options: SupabaseAuthOptions
    ) {
        super()

        this.logger_ = logger
        this.options_ = options

        this.client_ = createClient(
            options.supabaseUrl,
            options.supabaseServiceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
    }

    static validateOptions(options: Record<string, any>) {
        if (!options.supabaseUrl) {
            throw new Error("supabaseUrl is required in Supabase Auth provider options")
        }
        if (!options.supabaseServiceRoleKey) {
            throw new Error("supabaseServiceRoleKey is required in Supabase Auth provider options")
        }
    }

    /**
     * Authenticate a user by validating their Supabase JWT.
     * 
     * Expects the JWT in either:
     * - body.token (direct token passing)
     * - headers.authorization as "Bearer <token>"
     */
    async authenticate(
        data: AuthenticationInput,
        authIdentityProviderService: AuthIdentityProviderService
    ): Promise<AuthenticationResponse> {
        // Extract token from body or Authorization header
        const token =
            data.body?.token ||
            data.headers?.authorization?.replace("Bearer ", "")

        if (!token) {
            return {
                success: false,
                error: "No Supabase token provided. Send token in body or Authorization header.",
            }
        }

        try {
            // Validate JWT with Supabase
            const { data: userData, error } = await this.client_.auth.getUser(token)

            if (error || !userData.user) {
                this.logger_.warn(`Supabase auth failed: ${error?.message}`)
                return {
                    success: false,
                    error: error?.message || "Invalid Supabase token",
                }
            }

            const supabaseUserId = userData.user.id
            const email = userData.user.email || supabaseUserId

            // Try to retrieve existing auth identity
            try {
                const authIdentity = await authIdentityProviderService.retrieve({
                    entity_id: supabaseUserId,
                })

                return {
                    success: true,
                    authIdentity,
                }
            } catch (retrieveError: any) {
                // Identity doesn't exist yet — create it
                if (retrieveError.type === "not_found" || retrieveError.message?.includes("not found")) {
                    const createdAuthIdentity = await authIdentityProviderService.create({
                        entity_id: supabaseUserId,
                        provider_metadata: {
                            email,
                            supabase_user_id: supabaseUserId,
                        },
                        user_metadata: {
                            email,
                            full_name: userData.user.user_metadata?.full_name || "",
                        },
                    })

                    this.logger_.info(`Created Medusa auth identity for Supabase user ${supabaseUserId}`)

                    return {
                        success: true,
                        authIdentity: createdAuthIdentity,
                    }
                }

                return { success: false, error: retrieveError.message }
            }
        } catch (err: any) {
            this.logger_.error(`Supabase auth error: ${err.message}`)
            return {
                success: false,
                error: `Authentication failed: ${err.message}`,
            }
        }
    }

    /**
     * Register a new auth identity from Supabase.
     * Registration happens on Supabase side — this just creates the Medusa identity.
     */
    async register(
        data: AuthenticationInput,
        authIdentityProviderService: AuthIdentityProviderService
    ): Promise<AuthenticationResponse> {
        // For Supabase, registration = authentication (identity created on first auth)
        return this.authenticate(data, authIdentityProviderService)
    }

    /**
     * Update auth identity metadata.
     */
    async update(
        data: Record<string, unknown>,
        authIdentityProviderService: AuthIdentityProviderService
    ): Promise<AuthenticationResponse> {
        try {
            const entityId = data.entity_id as string
            if (!entityId) {
                return { success: false, error: "entity_id is required for update" }
            }

            const authIdentity = await authIdentityProviderService.update(entityId, {
                user_metadata: data.user_metadata as Record<string, unknown>,
            })

            return { success: true, authIdentity }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    }

    /**
     * Callback validation — not needed for direct JWT validation.
     */
    async validateCallback(
        data: AuthenticationInput,
        authIdentityProviderService: AuthIdentityProviderService
    ): Promise<AuthenticationResponse> {
        // Supabase Auth doesn't use OAuth callbacks through Medusa
        return this.authenticate(data, authIdentityProviderService)
    }
}

export default SupabaseAuthProviderService
