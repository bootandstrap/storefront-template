export interface PreviewPart {
    text: string
    bold: boolean
}

const DEFAULT_SAMPLE_DATA: Readonly<Record<string, string>> = {
    store_name: 'Mi Tienda',
    customer_name: 'Maria Garcia',
    customer_phone: '+34 612 345 678',
    total: '45,90 EUR',
    order_id: '#1042',
    items: '- Naranjas de Valencia x2 — 32,90 EUR\n- Limones Ecologicos x1 — 12,90 EUR',
}

function replaceTemplateVariables(
    template: string,
    sampleData: Readonly<Record<string, string>>
): string {
    let rendered = template

    for (const [key, value] of Object.entries(sampleData)) {
        rendered = rendered.replaceAll(`{{${key}}}`, value)
    }

    return rendered
}

export function renderWhatsAppPreviewParts(
    template: string,
    sampleData: Readonly<Record<string, string>> = DEFAULT_SAMPLE_DATA
): PreviewPart[] {
    const rendered = replaceTemplateVariables(template, sampleData)
    const parts: PreviewPart[] = []
    const boldPattern = /\*([^*]+)\*/g

    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = boldPattern.exec(rendered)) !== null) {
        const [fullMatch, boldText] = match
        const start = match.index
        const end = start + fullMatch.length

        if (start > lastIndex) {
            parts.push({ text: rendered.slice(lastIndex, start), bold: false })
        }

        parts.push({ text: boldText, bold: true })
        lastIndex = end
    }

    if (lastIndex < rendered.length) {
        parts.push({ text: rendered.slice(lastIndex), bold: false })
    }

    if (parts.length === 0) {
        return [{ text: rendered, bold: false }]
    }

    return parts
}
