/**
 * Type declarations for @point-of-sale packages
 * These packages ship without TypeScript declarations
 */

declare module '@point-of-sale/receipt-printer-encoder' {
    interface ReceiptPrinterEncoderOptions {
        language?: 'esc-pos' | 'star-prnt' | 'star-line'
        columns?: number
        newline?: string
        codepageMapping?: string
    }

    class ReceiptPrinterEncoder {
        constructor(options?: ReceiptPrinterEncoderOptions)
        initialize(): this
        align(value: 'left' | 'center' | 'right'): this
        bold(value?: boolean): this
        underline(value?: boolean): this
        italic(value?: boolean): this
        invert(value?: boolean): this
        size(width: number, height: number): this
        font(value: 'A' | 'B' | 'C'): this
        line(text: string): this
        text(text: string): this
        newline(): this
        rule(options?: { style?: 'single' | 'double' }): this
        barcode(value: string, symbology: string, options?: { height?: number; width?: number; text?: boolean }): this
        qrcode(value: string, model?: number, size?: number, errorlevel?: 'l' | 'm' | 'q' | 'h'): this
        image(image: ImageData, width: number, height: number, mode?: 'column' | 'raster'): this
        cut(type?: 'full' | 'partial'): this
        pulse(device?: number, on?: number, off?: number): this
        raw(data: number[]): this
        codepage(value: string | number): this
        encode(): Uint8Array
    }

    export default ReceiptPrinterEncoder
}

declare module '@point-of-sale/webserial-receipt-printer' {
    interface PrinterConnectionInfo {
        type: 'serial'
        vendorId: number | null
        productId: number | null
        language: string | null
        codepageMapping: string | null
    }

    class WebSerialReceiptPrinter {
        constructor(options?: { baudRate?: number; bufferSize?: number })
        connect(): Promise<void>
        reconnect(options: { vendorId?: number; productId?: number }): Promise<void>
        disconnect(): Promise<void>
        listen(): Promise<boolean>
        print(data: Uint8Array): Promise<void>
        addEventListener(event: 'connected', callback: (info: PrinterConnectionInfo) => void): void
        addEventListener(event: 'disconnected', callback: () => void): void
        addEventListener(event: 'data', callback: (data: Uint8Array) => void): void
    }

    export default WebSerialReceiptPrinter
}
