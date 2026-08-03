import { logger } from "./lib/logger"

export const EVIDENCE_PROPAGATION_HEADERS = [
    "x-trace-id",
    "x-tenant-id",
] as const

function requestHeaders(value: unknown): unknown {
    if (value === null || typeof value !== "object" || !("headers" in value)) return null
    return (value as { headers?: unknown }).headers
}

function headerValue(headers: unknown, headerName: string): string | null {
    if (headers instanceof Headers) return headers.get(headerName)
    if (headers === null || typeof headers !== "object" || Array.isArray(headers)) return null
    const value = (headers as Record<string, unknown>)[headerName]
    return typeof value === "string" ? value : null
}

function readRequestHeader(args: unknown[], headerName: string): string | null {
    for (const value of args) {
        const candidate = headerValue(requestHeaders(value), headerName)
        if (candidate !== null) return candidate
    }
    return null
}

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("../sentry.server.config")
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        await import("../sentry.edge.config")
    }
}

export const onRequestError = async (...args: unknown[]) => {
    const Sentry = await import("@sentry/nextjs")
    const sentryResult = (Sentry.captureRequestError as (...a: unknown[]) => void)(...args)
    const error = args[0]
    const traceId = readRequestHeader(args, "x-trace-id") || crypto.randomUUID()
    const tenantId = readRequestHeader(args, "x-tenant-id")

    try {
        await logger.evidence({
            trace_id: traceId,
            tenant_id: tenantId,
            revision: process.env.DEPLOY_SHA || process.env.npm_package_version || "dev",
            operation: "storefront.request_error",
            outcome: "failure",
            duration_ms: 0,
            error_class: error instanceof Error ? error.name : "UnknownError",
        })
    } catch {
        logger.error("[instrumentation] Evidence emission failed")
    }

    return sentryResult
}
