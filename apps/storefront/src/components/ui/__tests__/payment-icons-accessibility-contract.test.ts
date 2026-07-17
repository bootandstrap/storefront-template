import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'PaymentIcons.tsx'),
    'utf-8',
)

describe('PaymentIcons accessibility contract', () => {
    it('uses image semantics for labelled non-interactive payment icons', () => {
        expect(source).toContain('role="img"')
        expect(source).toContain('aria-label="Contra reembolso"')
        expect(source).toContain('aria-label="WhatsApp"')
    })
})
