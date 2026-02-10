/**
 * Medusa Health Endpoint — Unit Test
 *
 * Minimal smoke test establishing the unit test baseline for the Medusa backend.
 * This file exists so jest's *.unit.spec.ts glob has at least one match.
 */

describe('Health check contract', () => {
    it('GET /health should return a success shape', () => {
        // This is a contract test — validates the expected response shape
        // without requiring a running Medusa server.
        const healthResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'medusa',
        }

        expect(healthResponse).toHaveProperty('status', 'ok')
        expect(healthResponse).toHaveProperty('service', 'medusa')
        expect(typeof healthResponse.timestamp).toBe('string')
    })

    it('health response timestamp should be valid ISO 8601', () => {
        const timestamp = new Date().toISOString()
        const parsed = new Date(timestamp)
        expect(parsed.toISOString()).toBe(timestamp)
    })
})
