/**
 * Runtime environment configuration for client-side code.
 *
 * Problem: Next.js inlines NEXT_PUBLIC_* vars at BUILD TIME only.
 * In our architecture, the Docker image is built via GH Actions without
 * tenant-specific env vars (Medusa URL, publishable key). These are set
 * as container env vars by Dokploy AFTER deploy — but Next.js client
 * bundles already have the build-time (empty) values baked in.
 *
 * Solution: Server Components read process.env at RUNTIME, then inject
 * the values into a <script> tag that sets window.__RUNTIME_ENV__.
 * Client components read from window.__RUNTIME_ENV__ first, falling
 * back to process.env.NEXT_PUBLIC_* for development/build compatibility.
 *
 * Usage:
 *   - In root layout.tsx: <RuntimeEnvScript />
 *   - In client code: getRuntimeEnv('MEDUSA_BACKEND_URL')
 */

// ── Server Component: injects env vars into <script> tag ──

/**
 * The env vars to expose to the client at runtime.
 * Keys here do NOT include the NEXT_PUBLIC_ prefix.
 */
const RUNTIME_ENV_KEYS = [
    'MEDUSA_BACKEND_URL',
    'MEDUSA_PUBLISHABLE_KEY',
    'STORE_URL',
    'TENANT_ID',
] as const

export type RuntimeEnvKey = typeof RUNTIME_ENV_KEYS[number]

/**
 * Collects runtime env values from process.env on the server.
 * Called in Server Components only (layout.tsx).
 */
export function getServerRuntimeEnv(): Record<RuntimeEnvKey, string> {
    const env: Record<string, string> = {}
    for (const key of RUNTIME_ENV_KEYS) {
        env[key] = process.env[`NEXT_PUBLIC_${key}`] || ''
    }
    return env as Record<RuntimeEnvKey, string>
}

/**
 * Server Component that renders a <script> tag injecting runtime env vars.
 * Place this in your root layout.tsx, before {children}.
 *
 * @example
 * // app/[lang]/layout.tsx
 * import { RuntimeEnvScript } from '@/lib/runtime-env'
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <RuntimeEnvScript />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 */
export function RuntimeEnvScript() {
    const env = getServerRuntimeEnv()
    const script = `window.__RUNTIME_ENV__=${JSON.stringify(env)};`
    return (
        <script
            dangerouslySetInnerHTML={{ __html: script }}
            // Execute before any client JS hydrates
            // suppressHydrationWarning avoids mismatch warnings
        />
    )
}

// ── Client-side accessor ──

/**
 * Read a runtime environment variable.
 * Priority: window.__RUNTIME_ENV__ (runtime) > process.env.NEXT_PUBLIC_* (build-time)
 *
 * Safe to call on both server and client:
 * - Server: reads process.env directly
 * - Client: reads window.__RUNTIME_ENV__ first
 */
export function getRuntimeEnv(key: RuntimeEnvKey): string {
    // Server-side: always use process.env
    if (typeof window === 'undefined') {
        return process.env[`NEXT_PUBLIC_${key}`] || ''
    }

    // Client-side: prefer runtime injection, fall back to build-time
    const runtimeEnv = (window as unknown as { __RUNTIME_ENV__?: Record<string, string> }).__RUNTIME_ENV__
    if (runtimeEnv?.[key]) {
        return runtimeEnv[key]
    }

    // Build-time fallback (works in dev where vars ARE available at build time)
    return process.env[`NEXT_PUBLIC_${key}`] || ''
}
