/**
 * Lightweight CMS HTML sanitizer — allowlist-based.
 *
 * Strips all tags/attributes not in the allowlist to prevent XSS
 * from CMS content rendered via dangerouslySetInnerHTML.
 *
 * No external dependencies — uses regex-based tag parsing.
 */

const ALLOWED_TAGS = new Set([
    // Text
    'p', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'mark', 'small', 'sub', 'sup', 'abbr', 'code', 'pre', 'kbd',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links & images
    'a', 'img',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    // Block
    'div', 'blockquote', 'figure', 'figcaption', 'hr',
    // Media
    'video', 'source', 'audio',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
    a: new Set(['href', 'title', 'target', 'rel']),
    img: new Set(['src', 'alt', 'width', 'height', 'loading']),
    video: new Set(['src', 'width', 'height', 'controls', 'poster']),
    audio: new Set(['src', 'controls']),
    source: new Set(['src', 'type']),
    td: new Set(['colspan', 'rowspan']),
    th: new Set(['colspan', 'rowspan', 'scope']),
    // All elements can have class and id
    '*': new Set(['class', 'id']),
}

// Patterns matching dangerous content
const DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript|data):/i
const EVENT_HANDLER = /^on/i

/**
 * Sanitize HTML string using allowlist approach.
 *
 * @param html - Raw HTML string from CMS
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
    if (!html) return ''

    // Remove <script>, <style>, <iframe>, <object>, <embed>, <form> blocks entirely
    let clean = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<iframe\b[^>]*\/>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^>]*\/?>/gi, '')
        .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')

    // Process remaining tags
    clean = clean.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)?\/?>/gi, (match, tag: string, attrs: string) => {
        const normalizedTag = tag.toLowerCase()

        // If tag is not allowed, strip it entirely
        if (!ALLOWED_TAGS.has(normalizedTag)) {
            return ''
        }

        // Closing tags
        if (match.startsWith('</')) {
            return `</${normalizedTag}>`
        }

        // Process attributes
        const allowedForTag = ALLOWED_ATTRS[normalizedTag] || new Set<string>()
        const globalAttrs = ALLOWED_ATTRS['*']
        const cleanAttrs: string[] = []

        if (attrs) {
            // Match attribute patterns: name="value", name='value', name=value, name (boolean)
            const attrPattern = /([a-z][a-z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/gi
            let attrMatch: RegExpExecArray | null
            while ((attrMatch = attrPattern.exec(attrs)) !== null) {
                const attrName = attrMatch[1].toLowerCase()
                const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''

                // Skip event handlers
                if (EVENT_HANDLER.test(attrName)) continue

                // Skip style (potential CSS injection vector)
                if (attrName === 'style') continue

                // Check if attribute is allowed for this tag or globally
                if (!allowedForTag.has(attrName) && !globalAttrs.has(attrName)) continue

                // For href/src, check for dangerous protocols
                if ((attrName === 'href' || attrName === 'src') && DANGEROUS_PROTOCOL.test(attrValue)) {
                    continue
                }

                // Force safe target/rel on links
                if (normalizedTag === 'a' && attrName === 'target') {
                    cleanAttrs.push('target="_blank"')
                    cleanAttrs.push('rel="noopener noreferrer"')
                    continue
                }
                if (normalizedTag === 'a' && attrName === 'rel') {
                    continue // Already handled with target
                }

                cleanAttrs.push(`${attrName}="${escapeAttrValue(attrValue)}"`)
            }
        }

        // For links without explicit target, add safe defaults
        if (normalizedTag === 'a' && !cleanAttrs.some(a => a.startsWith('target='))) {
            // Internal links don't need target="_blank"
        }

        const isSelfClosing = match.endsWith('/>') || normalizedTag === 'br' || normalizedTag === 'hr' || normalizedTag === 'img'
        const attrStr = cleanAttrs.length > 0 ? ' ' + cleanAttrs.join(' ') : ''
        return isSelfClosing ? `<${normalizedTag}${attrStr} />` : `<${normalizedTag}${attrStr}>`
    })

    return clean
}

/**
 * Escape attribute value to prevent attribute injection.
 */
function escapeAttrValue(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}
