import * as Sentry from "@sentry/nextjs"

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Free tier: keep sample rate low
    tracesSampleRate: 0.1,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Tag every event with tenant_id
    initialScope: {
        tags: {
            tenant_id: process.env.TENANT_ID || "unknown",
        },
    },
})
