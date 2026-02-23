module.exports = {
    ci: {
        collect: {
            url: [
                'http://localhost:3000/',
                'http://localhost:3000/es/productos',
            ],
            startServerCommand: 'pnpm start',
            startServerReadyPattern: 'Ready',
            startServerReadyTimeout: 30000,
            numberOfRuns: 3,
            settings: {
                preset: 'desktop',
                // Skip audits that don't apply to dynamic SSR apps
                skipAudits: ['uses-http2'],
            },
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', { minScore: 0.85 }],
                'categories:accessibility': ['error', { minScore: 0.90 }],
                'categories:best-practices': ['warn', { minScore: 0.90 }],
                'categories:seo': ['warn', { minScore: 0.90 }],
                // Core Web Vitals
                'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
                'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
                'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
                'total-blocking-time': ['warn', { maxNumericValue: 300 }],
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
}
