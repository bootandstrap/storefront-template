/**
 * barcode-generator.ts — JsBarcode SVG wrapper for price labels
 *
 * Generates barcode SVG strings for printing on price labels.
 * Uses JsBarcode (MIT, 3.5k★) with lazy loading.
 */

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39'

export interface BarcodeOptions {
    format?: BarcodeFormat
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
    margin?: number
}

const DEFAULT_OPTIONS: Required<BarcodeOptions> = {
    format: 'CODE128',
    width: 2,
    height: 40,
    displayValue: true,
    fontSize: 12,
    margin: 4,
}

/**
 * Renders a barcode into an SVG element.
 * Must be called client-side (uses DOM).
 *
 * @param svgElement - An SVG DOM element to render into
 * @param value - The barcode value (SKU, EAN, etc.)
 * @param options - Barcode display options
 */
export async function renderBarcode(
    svgElement: SVGSVGElement,
    value: string,
    options: BarcodeOptions = {}
): Promise<void> {
    const JsBarcode = (await import('jsbarcode')).default
    const opts = { ...DEFAULT_OPTIONS, ...options }

    try {
        JsBarcode(svgElement, value, {
            format: opts.format,
            width: opts.width,
            height: opts.height,
            displayValue: opts.displayValue,
            fontSize: opts.fontSize,
            margin: opts.margin,
            lineColor: '#000000',
            background: 'transparent',
        })
    } catch {
        // Fallback: render the value as text if barcode generation fails
        // (e.g., invalid EAN-13 checksum)
        JsBarcode(svgElement, value, {
            ...opts,
            format: 'CODE128', // CODE128 accepts any string
            lineColor: '#000000',
            background: 'transparent',
        })
    }
}

/**
 * Validates if a string is a valid EAN-13 barcode value.
 */
export function isValidEAN13(value: string): boolean {
    if (!/^\d{13}$/.test(value)) return false
    const digits = value.split('').map(Number)
    const checksum = digits.slice(0, 12).reduce((sum, d, i) =>
        sum + d * (i % 2 === 0 ? 1 : 3), 0
    )
    return (10 - (checksum % 10)) % 10 === digits[12]
}
