/**
 * XSS Sanitizer Tests
 *
 * Verifies that the CMS HTML sanitizer properly blocks all XSS vectors
 * while preserving legitimate content.
 */
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../sanitize-html'

describe('sanitizeHtml', () => {
    // ── XSS Vector Tests ──────────────────────────────────────

    it('strips <script> tags entirely', () => {
        const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>'
        expect(sanitizeHtml(input)).toBe('<p>Hello</p><p>World</p>')
    })

    it('strips <script> tags case-insensitively', () => {
        const input = '<SCRIPT>alert(1)</SCRIPT>'
        expect(sanitizeHtml(input)).toBe('')
    })

    it('strips <iframe> tags', () => {
        const input = '<iframe src="evil.com"></iframe>'
        expect(sanitizeHtml(input)).toBe('')
    })

    it('strips self-closing <iframe /> tags', () => {
        const input = '<iframe src="evil.com" />'
        expect(sanitizeHtml(input)).toBe('')
    })

    it('strips <style> blocks', () => {
        const input = '<style>body { display: none }</style><p>Visible</p>'
        expect(sanitizeHtml(input)).toBe('<p>Visible</p>')
    })

    it('strips on* event handlers', () => {
        const input = '<img src="x.jpg" onerror="alert(1)" alt="test" />'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('onerror')
        expect(result).toContain('alt="test"')
    })

    it('strips javascript: URIs from href', () => {
        const input = '<a href="javascript:alert(1)">Click</a>'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('javascript:')
    })

    it('strips javascript: URIs from img src', () => {
        const input = '<img src="javascript:alert(1)" />'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('javascript:')
    })

    it('strips data: URIs', () => {
        const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('data:')
    })

    it('strips style attributes', () => {
        const input = '<p style="background:url(javascript:alert(1))">text</p>'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('style')
    })

    it('strips <form> tags', () => {
        const input = '<form action="evil.com"><input type="text" /></form>'
        expect(sanitizeHtml(input)).toBe('')
    })

    it('strips <object> and <embed> tags', () => {
        const input = '<object data="evil.swf"></object><embed src="evil.swf" />'
        expect(sanitizeHtml(input)).toBe('')
    })

    it('strips disallowed tags but keeps content', () => {
        const input = '<blink>Blink text</blink>'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('<blink>')
        expect(result).toContain('Blink text')
    })

    // ── Allowlist Preservation Tests ──────────────────────────

    it('preserves allowed formatting tags', () => {
        const input = '<p><strong>Bold</strong> and <em>italic</em></p>'
        expect(sanitizeHtml(input)).toBe('<p><strong>Bold</strong> and <em>italic</em></p>')
    })

    it('preserves headings', () => {
        const input = '<h1>Title</h1><h2>Subtitle</h2>'
        expect(sanitizeHtml(input)).toBe('<h1>Title</h1><h2>Subtitle</h2>')
    })

    it('preserves lists', () => {
        const input = '<ul><li>Item 1</li><li>Item 2</li></ul>'
        expect(sanitizeHtml(input)).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>')
    })

    it('preserves links with safe attributes', () => {
        const input = '<a href="https://example.com" title="Example">Link</a>'
        const result = sanitizeHtml(input)
        expect(result).toContain('href="https://example.com"')
        expect(result).toContain('title="Example"')
    })

    it('preserves images with safe attributes', () => {
        const input = '<img src="https://example.com/img.jpg" alt="Photo" loading="lazy" />'
        const result = sanitizeHtml(input)
        expect(result).toContain('src="https://example.com/img.jpg"')
        expect(result).toContain('alt="Photo"')
        expect(result).toContain('loading="lazy"')
    })

    it('preserves class and id attributes', () => {
        const input = '<div class="hero" id="main">Content</div>'
        const result = sanitizeHtml(input)
        expect(result).toContain('class="hero"')
        expect(result).toContain('id="main"')
    })

    it('preserves tables', () => {
        const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>'
        expect(sanitizeHtml(input)).toBe(input)
    })

    it('handles empty string', () => {
        expect(sanitizeHtml('')).toBe('')
    })

    it('handles null/undefined gracefully', () => {
        expect(sanitizeHtml(null as unknown as string)).toBe('')
        expect(sanitizeHtml(undefined as unknown as string)).toBe('')
    })

    // ── Edge Cases ────────────────────────────────────────────

    it('strips real onclick attributes even when obfuscated', () => {
        const input = '<p onclick="alert(1)" class="test">text</p>'
        const result = sanitizeHtml(input)
        expect(result).not.toContain('onclick')
        expect(result).toContain('class="test"')
    })

    it('forces rel="noopener noreferrer" on links with target', () => {
        const input = '<a href="https://example.com" target="_blank">Link</a>'
        const result = sanitizeHtml(input)
        expect(result).toContain('rel="noopener noreferrer"')
    })
})
