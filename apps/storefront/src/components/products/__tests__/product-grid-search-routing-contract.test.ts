import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'ProductGrid.tsx'),
    'utf-8',
)

describe('ProductGrid search routing contract', () => {
    it('does not push search params on initial render when the query is unchanged', () => {
        expect(source).toContain('if (searchInput === currentQuery) return')
    })

    it('keeps the debounced search effect dependency-safe', () => {
        expect(source).not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps')
        expect(source).toContain('}, [searchInput, currentQuery, updateParams])')
    })
})
