import * as Sentry from "@sentry/nextjs"

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Free tier: keep sample rate low to stay within 5K events/month
    tracesSampleRate: 0.1,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Clean up breadcrumbs
    beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === "console") return null
        return breadcrumb
    },
})
