import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('getRuntimeBuildInfo', () => {
    const originalEnv = process.env

    beforeEach(() => {
        vi.resetModules()
        process.env = { ...originalEnv }
        delete process.env.APP_GIT_COMMIT_SHA
        delete process.env.GIT_COMMIT_SHA
        delete process.env.APP_GIT_BRANCH
        delete process.env.GIT_BRANCH
        delete process.env.APP_DEPLOYED_AT
        delete process.env.DEPLOYED_AT
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('reads non-secret deployment revision metadata from env', async () => {
        process.env.APP_GIT_COMMIT_SHA = '04767d1675a01e28b49dd1030e0968e6f6dc88bb'
        process.env.APP_GIT_BRANCH = 'main'
        process.env.APP_DEPLOYED_AT = '2026-07-23T17:38:45Z'

        const { getRuntimeBuildInfo } = await import('../runtime-build-info')

        expect(getRuntimeBuildInfo()).toEqual({
            commitSha: '04767d1675a01e28b49dd1030e0968e6f6dc88bb',
            commitShortSha: '04767d16',
            branch: 'main',
            deployedAt: '2026-07-23T17:38:45Z',
            source: 'env',
        })
    })

    it('returns unknown when no build metadata is configured', async () => {
        const { getRuntimeBuildInfo } = await import('../runtime-build-info')

        expect(getRuntimeBuildInfo()).toEqual({
            commitSha: null,
            commitShortSha: null,
            branch: null,
            deployedAt: null,
            source: 'unknown',
        })
    })
})
