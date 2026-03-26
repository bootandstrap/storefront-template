import { describe, expect, it, vi } from 'vitest'
import { isValidEAN13 } from '../barcode-generator'

// ── Mock jsbarcode dynamic import ──
vi.mock('jsbarcode', () => ({
    default: vi.fn(),
}))

describe('barcode-generator', () => {
    // ── isValidEAN13 ──

    describe('isValidEAN13', () => {
        it('returns true for valid EAN-13', () => {
            // Standard barcode: 5901234123457
            expect(isValidEAN13('5901234123457')).toBe(true)
        })

        it('returns true for another valid EAN-13', () => {
            // 4006381333931
            expect(isValidEAN13('4006381333931')).toBe(true)
        })

        it('returns false for wrong checksum', () => {
            expect(isValidEAN13('5901234123456')).toBe(false)
        })

        it('returns false for wrong length (12 digits)', () => {
            expect(isValidEAN13('590123412345')).toBe(false)
        })

        it('returns false for wrong length (14 digits)', () => {
            expect(isValidEAN13('59012341234570')).toBe(false)
        })

        it('returns false for non-numeric input', () => {
            expect(isValidEAN13('590123412345a')).toBe(false)
        })

        it('returns false for empty string', () => {
            expect(isValidEAN13('')).toBe(false)
        })
    })

    // ── renderBarcode ──

    describe('renderBarcode', () => {
        it('calls JsBarcode with correct arguments', async () => {
            const { renderBarcode } = await import('../barcode-generator')
            const JsBarcode = (await import('jsbarcode')).default as ReturnType<typeof vi.fn>

            const mockSvg = {} as SVGSVGElement

            await renderBarcode(mockSvg, 'TEST-SKU-123')

            expect(JsBarcode).toHaveBeenCalledWith(
                mockSvg,
                'TEST-SKU-123',
                expect.objectContaining({
                    format: 'CODE128',
                    lineColor: '#000000',
                    background: 'transparent',
                })
            )
        })

        it('respects custom format option', async () => {
            const { renderBarcode } = await import('../barcode-generator')
            const JsBarcode = (await import('jsbarcode')).default as ReturnType<typeof vi.fn>
            JsBarcode.mockClear()

            const mockSvg = {} as SVGSVGElement

            await renderBarcode(mockSvg, '1234567890', { format: 'CODE39' })

            expect(JsBarcode).toHaveBeenCalledWith(
                mockSvg,
                '1234567890',
                expect.objectContaining({ format: 'CODE39' })
            )
        })

        it('falls back to CODE128 on error', async () => {
            const { renderBarcode } = await import('../barcode-generator')
            const JsBarcode = (await import('jsbarcode')).default as ReturnType<typeof vi.fn>

            // First call throws, second (fallback) succeeds
            JsBarcode.mockClear()
            JsBarcode.mockImplementationOnce(() => { throw new Error('Invalid barcode') })

            const mockSvg = {} as SVGSVGElement

            await renderBarcode(mockSvg, 'INVALID', { format: 'EAN13' })

            // Second call should use CODE128 fallback
            expect(JsBarcode).toHaveBeenCalledTimes(2)
            expect(JsBarcode.mock.calls[1][2]).toMatchObject({ format: 'CODE128' })
        })
    })
})
