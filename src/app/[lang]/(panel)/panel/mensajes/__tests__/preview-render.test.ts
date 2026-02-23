import { describe, expect, it } from 'vitest'
import { renderWhatsAppPreviewParts } from '../preview-render'

describe('renderWhatsAppPreviewParts', () => {
    it('replaces known variables and marks bold segments', () => {
        const parts = renderWhatsAppPreviewParts('Hola *{{customer_name}}* de {{store_name}}')

        expect(parts).toEqual([
            { text: 'Hola ', bold: false },
            { text: 'Maria Garcia', bold: true },
            { text: ' de Mi Tienda', bold: false },
        ])
    })

    it('keeps attacker HTML as plain text (no HTML rendering path)', () => {
        const parts = renderWhatsAppPreviewParts('Pago: <img src=x onerror=alert(1)>')

        expect(parts).toEqual([
            { text: 'Pago: <img src=x onerror=alert(1)>', bold: false },
        ])
    })
})
