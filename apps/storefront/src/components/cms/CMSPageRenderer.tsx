import type { StoreConfig } from '@/lib/config'
import { sanitizeHtml } from '@/lib/security/sanitize-html'

interface CMSPageRendererProps {
    title: string
    body: string
    config: StoreConfig
}

export default function CMSPageRenderer({ title, body }: CMSPageRendererProps) {
    const safeBody = sanitizeHtml(body)

    return (
        <article className="container-page py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <header className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold font-display text-text-primary mb-4">
                        {title}
                    </h1>
                    <div className="w-20 h-1 rounded-full bg-gradient-to-r from-primary to-secondary" />
                </header>

                {/* Content - sanitized HTML from CMS */}
                <div
                    className="cms-content prose prose-lg max-w-none text-text-secondary"
                    dangerouslySetInnerHTML={{ __html: safeBody }}
                />
            </div>
        </article>
    )
}
