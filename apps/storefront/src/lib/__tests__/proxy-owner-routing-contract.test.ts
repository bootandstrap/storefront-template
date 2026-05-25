import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const proxyPath = path.resolve(process.cwd(), 'src/proxy.ts')

describe('proxy owner routing contract', () => {
    it('keeps owner routing minimal and does not resolve tenant config in proxy', () => {
        const source = fs.readFileSync(proxyPath, 'utf8')

        expect(source).not.toContain("await import('@/lib/config')")
        expect(source).not.toContain('getConfig()')
        expect(source).not.toContain('shouldAllowPanelRoute')
    })
})
