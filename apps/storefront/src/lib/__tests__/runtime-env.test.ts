import { afterEach, describe, expect, it, vi } from 'vitest'

import { readFileSync } from 'fs'
import { join } from 'path'
import { RuntimeEnvScript, getServerRuntimeEnv } from '../runtime-env'

describe('runtime env injection', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('exposes runtime MEDUSA_BACKEND_URL when only the container env is set', () => {
        vi.stubEnv('MEDUSA_BACKEND_URL', 'https://medusa.example.com')
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', '')

        expect(getServerRuntimeEnv().MEDUSA_BACKEND_URL).toBe('https://medusa.example.com')
    })

    it('RuntimeEnvScript accepts the CSP nonce used by production proxy', () => {
        const element = RuntimeEnvScript({ nonce: 'nonce-for-test' })

        expect(element.props.nonce).toBe('nonce-for-test')
    })

    it('root layout forwards x-csp-nonce into RuntimeEnvScript', () => {
        const layout = readFileSync(join(__dirname, '../../app/layout.tsx'), 'utf-8')

        expect(layout).toContain("headersList.get('x-csp-nonce')")
        expect(layout).toContain('<RuntimeEnvScript nonce={cspNonce} />')
    })

    it('proxy forwards the CSP nonce header before creating the downstream response', () => {
        const proxy = readFileSync(join(__dirname, '../../proxy.ts'), 'utf-8')
        const nonceIndex = proxy.indexOf("request.headers.set('x-csp-nonce', nonce)")
        const nextResponseIndex = proxy.indexOf('NextResponse.next({ request')

        expect(nonceIndex).toBeGreaterThan(-1)
        expect(nextResponseIndex).toBeGreaterThan(nonceIndex)
    })

    it('proxy allows Stripe browser worker creation without loosening script-src', () => {
        const proxy = readFileSync(join(__dirname, '../../proxy.ts'), 'utf-8')

        expect(proxy).toContain("worker-src 'self' blob:")
    })
})
