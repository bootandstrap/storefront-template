#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i

export function resolveFunctionalCheckoutCertification(env = process.env) {
    const baseUrl = env.BNS_360_BASE_URL || env.NEXT_PUBLIC_STORE_URL || env.BASE_URL

    if (!baseUrl) {
        throw new Error('BNS_360_BASE_URL is required for functional checkout certification.')
    }

    let parsedUrl
    try {
        parsedUrl = new URL(baseUrl)
    } catch {
        throw new Error(`BNS_360_BASE_URL must be an absolute http(s) URL: ${baseUrl}`)
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`BNS_360_BASE_URL must use http(s): ${baseUrl}`)
    }

    if (LOCALHOST_RE.test(parsedUrl.origin) && env.BNS_ALLOW_LOCAL_FUNCTIONAL_CHECKOUT !== '1') {
        throw new Error(
            'Functional checkout certification requires a remote deployed storefront. ' +
            'Set BNS_ALLOW_LOCAL_FUNCTIONAL_CHECKOUT=1 only for local development drills.'
        )
    }

    return {
        command: 'pnpm',
        args: [
            'test:e2e',
            'e2e/functional-checkout.spec.ts',
            '--project=chromium',
        ],
        env: {
            ...env,
            BNS_360_BASE_URL: parsedUrl.origin,
            BNS_FUNCTIONAL_CHECKOUT_E2E: '1',
            BNS_CHECKOUT_PAYMENT_MODE: 'cod_simulator',
        },
        summary: `Functional checkout certification against ${parsedUrl.origin} using COD simulator.`,
    }
}

export function runFunctionalCheckoutCertification(env = process.env) {
    const resolved = resolveFunctionalCheckoutCertification(env)
    process.stdout.write(`${resolved.summary}\n`)

    const result = spawnSync(resolved.command, resolved.args, {
        cwd: process.cwd(),
        env: resolved.env,
        stdio: 'inherit',
    })

    if (result.error) {
        throw result.error
    }

    return result.status ?? 1
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
    try {
        process.exitCode = runFunctionalCheckoutCertification(process.env)
    } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
        process.exitCode = 1
    }
}
