/**
 * CSV Export utility for the owner panel.
 * Supports any flat data array — orders, customers, products, etc.
 * 
 * Features:
 * - Automatic header detection from object keys
 * - Custom column mapping (rename headers, select which fields to export)
 * - Proper CSV escaping (quotes, commas, newlines)
 * - BOM prefix for Excel UTF-8 compatibility
 * - Browser download trigger (no server round-trip)
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>

interface ExportOptions<T extends CsvRow> {
    /** Data rows to export */
    data: T[]
    /** Filename without extension */
    filename: string
    /** Optional column mapping: { dataKey: 'Display Header' } */
    columns?: Partial<Record<keyof T, string>>
    /** Optional column order (subset of keys) */
    columnOrder?: (keyof T)[]
}

/**
 * Escape a CSV cell value — handles commas, quotes, and newlines.
 */
function escapeCsvCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // If contains comma, quote, or newline → wrap in quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Export data as a CSV file and trigger browser download.
 */
export function exportToCsv<T extends CsvRow>({
    data,
    filename,
    columns,
    columnOrder,
}: ExportOptions<T>): void {
    if (data.length === 0) return

    // Determine columns and their order
    const keys = columnOrder
        ? columnOrder
        : (Object.keys(data[0]) as (keyof T)[])

    // Build header row
    const headerRow = keys
        .map(key => escapeCsvCell(columns?.[key] ?? String(key)))
        .join(',')

    // Build data rows
    const dataRows = data.map(row =>
        keys.map(key => escapeCsvCell(row[key])).join(',')
    )

    // Combine with BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF'
    const csvContent = BOM + [headerRow, ...dataRows].join('\n')

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, 100)
}

// ── Pre-built export presets for common panel data ──────────────────────

export function exportOrders(orders: CsvRow[]) {
    exportToCsv({
        data: orders,
        filename: `orders-${new Date().toISOString().slice(0, 10)}`,
        columns: {
            display_id: 'Order #',
            email: 'Customer Email',
            total: 'Total',
            currency_code: 'Currency',
            status: 'Status',
            fulfillment_status: 'Fulfillment',
            payment_status: 'Payment',
            created_at: 'Date',
        },
        columnOrder: ['display_id', 'email', 'total', 'currency_code', 'status', 'fulfillment_status', 'payment_status', 'created_at'],
    })
}

export function exportCustomers(customers: CsvRow[]) {
    exportToCsv({
        data: customers,
        filename: `customers-${new Date().toISOString().slice(0, 10)}`,
        columns: {
            email: 'Email',
            first_name: 'First Name',
            last_name: 'Last Name',
            phone: 'Phone',
            created_at: 'Registered',
            orders_count: 'Orders',
        },
        columnOrder: ['email', 'first_name', 'last_name', 'phone', 'created_at', 'orders_count'],
    })
}

export function exportProducts(products: CsvRow[]) {
    exportToCsv({
        data: products,
        filename: `products-${new Date().toISOString().slice(0, 10)}`,
        columns: {
            title: 'Product',
            handle: 'Handle',
            status: 'Status',
            variants_count: 'Variants',
            inventory: 'Stock',
            price: 'Price',
        },
        columnOrder: ['title', 'handle', 'status', 'variants_count', 'inventory', 'price'],
    })
}
