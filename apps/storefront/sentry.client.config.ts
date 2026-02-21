import * as Sentry from "@sentry/nextjs"

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Free tier: keep sample rate low to stay within 5K events/month
    tracesSampleRate: 0.1,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Enable Sentry structured logging
    enableLogs: true,

    // Tag every event with tenant_id for per-tenant filtering
    initialScope: {
        tags: {
            tenant_id: process.env.NEXT_PUBLIC_TENANT_ID || "unknown",
        },
    },

    // Send console.error + console.warn as Sentry logs
    integrations: [
        Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],

    // Clean up breadcrumbs
    beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === "console") return null
        return breadcrumb
    },
})
