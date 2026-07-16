import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const stepsDir = join(__dirname, '..', 'steps')

function readStep(fileName: string) {
    return readFileSync(join(stepsDir, fileName), 'utf-8')
}

describe('checkout form accessibility contract', () => {
    it('associates customer info labels with stable input ids and names', () => {
        const source = readStep('CheckoutInfoStep.tsx')
        const fields = [
            'checkout-first-name',
            'checkout-last-name',
            'checkout-email',
            'checkout-phone',
        ]

        for (const id of fields) {
            expect(source).toContain(`htmlFor="${id}"`)
            expect(source).toContain(`id="${id}"`)
            expect(source).toContain(`name="${id}"`)
        }
    })

    it('associates address labels with stable control ids and names', () => {
        const source = readStep('CheckoutAddressStep.tsx')
        const fields = [
            'checkout-street',
            'checkout-street2',
            'checkout-city',
            'checkout-postal-code',
            'checkout-country',
            'checkout-notes',
        ]

        for (const id of fields) {
            expect(source).toContain(`htmlFor="${id}"`)
            expect(source).toContain(`id="${id}"`)
            expect(source).toContain(`name="${id}"`)
        }
    })
})
