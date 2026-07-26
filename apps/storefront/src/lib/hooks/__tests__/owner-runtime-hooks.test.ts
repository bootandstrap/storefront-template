import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const hooksRoot = path.resolve(process.cwd(), 'src/lib/hooks')

function readHook(fileName: string) {
    return fs.readFileSync(path.join(hooksRoot, fileName), 'utf8')
}

describe('owner runtime hook contracts', () => {
    it('useRealtimeGovernance subscribes to tenant-scoped broadcasts and cleans up resources', () => {
        const source = readHook('useRealtimeGovernance.ts')

        expect(source).toContain('useRealtimeGovernance')
        expect(source).toContain('governance:${tenantId}')
        expect(source).toContain("event: 'governance_change'")
        expect(source).toContain('router.refresh()')
        expect(source).toContain('DEBOUNCE_MS = 1500')
        expect(source).toContain('clearTimeout(debounceRef.current)')
        expect(source).toContain('channel.unsubscribe()')
        expect(source).toContain('getGovernanceBrowserClient()')
    })

    it('useFormGuard preserves explicit-save UX with dirty tracking, reset and unload guard', () => {
        const source = readHook('useFormGuard.ts')

        expect(source).toContain('useFormGuard')
        expect(source).toContain('dirtyFields')
        expect(source).toContain('JSON.stringify(initialVal) !== JSON.stringify(currentVal)')
        expect(source).toContain('if (!isDirty || isSaving) return')
        expect(source).toContain('await onSave(values)')
        expect(source).toContain('setInitial(values)')
        expect(source).toContain('setValuesState(initial)')
        expect(source).toContain("window.addEventListener('beforeunload', handler)")
        expect(source).toContain("window.removeEventListener('beforeunload', handler)")
    })

    it('useScrollReveal observes .reveal children once and disconnects observers', () => {
        const source = readHook('useScrollReveal.ts')

        expect(source).toContain('useScrollReveal')
        expect(source).toContain('new IntersectionObserver')
        expect(source).toContain("container.querySelectorAll('.reveal')")
        expect(source).toContain("entry.target.classList.add('revealed')")
        expect(source).toContain('observer.unobserve(entry.target)')
        expect(source).toContain('observer.disconnect()')
        expect(source).toContain("rootMargin: '0px 0px -50px 0px'")
    })
})
