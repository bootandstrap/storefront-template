import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'ProductDetailClient.tsx'),
    'utf-8',
)

describe('ProductDetailClient accessibility contract', () => {
    it('uses AA-safe text contrast for the in-stock status on light backgrounds', () => {
        expect(source).not.toContain("'text-green-600 dark:text-green-400'")
        expect(source).toContain("'text-green-700 dark:text-green-400'")
    })
})
