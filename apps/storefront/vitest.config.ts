import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            // server-only throws in non-RSC environments; stub it for tests
            'server-only': path.resolve(__dirname, 'src/lib/__tests__/__mocks__/server-only.ts'),
        },
    },
    test: {
        environment: 'node',
        globals: true,
        include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', 'e2e'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: [
                'src/lib/**/*.ts',
            ],
            exclude: [
                'src/lib/supabase/**',
                'src/lib/medusa/client.ts',
                'src/lib/medusa/auth-medusa.ts',
                'src/lib/i18n/actions.ts',
                'src/lib/i18n/provider.tsx',
                'src/lib/i18n/locale.ts',
                'src/lib/config.ts',
                'src/**/*.test.*',
                'src/**/*.d.ts',
            ],
        },
    },
})
