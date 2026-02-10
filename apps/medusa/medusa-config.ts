import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// ---------------------------------------------------------------------------
// Require secrets in production — never fall back to hardcoded values
// ---------------------------------------------------------------------------
function requireSecret(envVar: string, name: string): string {
  const value = process.env[envVar]
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[FATAL] ${name} (${envVar}) is required in production`)
  }
  console.warn(`[medusa] ⚠️ ${envVar} not set — using insecure dev fallback`)
  return `__dev_only_${name}_change_me__`
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    databaseLogging: process.env.NODE_ENV !== "production",
    databaseDriverOptions: {
      connection: { ssl: { rejectUnauthorized: false } },
    },
    redisUrl: process.env.REDIS_URL,
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "server" | "worker") || "shared",
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:3000,http://localhost:5173",
      authCors: process.env.AUTH_CORS || "http://localhost:3000",
      jwtSecret: requireSecret('JWT_SECRET', 'jwt_secret'),
      cookieSecret: requireSecret('COOKIE_SECRET', 'cookie_secret'),
    },
  },
  modules: [
    // Supabase Auth Provider
    {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          // Keep default email/password for admin
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          // Supabase JWT validation for customers
          {
            resolve: "./src/modules/supabase-auth",
            id: "supabase",
            options: {
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
              supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        ],
      },
    },
    // Supabase Storage Provider (replaces local file storage)
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/supabase-storage",
            id: "supabase-storage",
            options: {
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
              supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              bucketName: process.env.SUPABASE_STORAGE_BUCKET || "product-images",
            },
          },
        ],
      },
    },
    // Stripe Payment Provider (template-first: uses PLACEHOLDER keys by default)
    // When STRIPE_SECRET_KEY contains "PLACEHOLDER", payment sessions won't be created
    // Replace with real keys from your Stripe dashboard to activate card payments
    ...(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('PLACEHOLDER')
      ? [
        {
          resolve: "@medusajs/medusa/payment",
          options: {
            providers: [
              {
                resolve: "@medusajs/payment-stripe",
                id: "stripe",
                options: {
                  apiKey: process.env.STRIPE_SECRET_KEY,
                  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                },
              },
            ],
          },
        },
      ]
      : []),
  ],
})

