/**
 * PanelBlockRenderer — Renders saved blocks as styled HTML for the storefront
 *
 * Takes the same Block[] format from PanelBlockEditor and renders it
 * with storefront-optimized styling (not panel styling).
 *
 * Usage (server component):
 *   import PanelBlockRenderer from '@/components/panel/PanelBlockRenderer'
 *   <PanelBlockRenderer blocks={page.blocks} />
 */

import type { Block } from './PanelBlockEditor'

interface PanelBlockRendererProps {
    blocks: Block[]
    className?: string
}

export default function PanelBlockRenderer({ blocks, className = '' }: PanelBlockRendererProps) {
    if (!blocks || blocks.length === 0) return null

    return (
        <article className={`prose prose-lg max-w-none ${className}`}>
            {blocks.map(block => (
                <BlockView key={block.id} block={block} />
            ))}
        </article>
    )
}

function BlockView({ block }: { block: Block }) {
    switch (block.type) {
        case 'heading': {
            switch (block.level) {
                case 1:
                    return <h1 className="text-3xl font-bold font-display mt-8 mb-4">{block.content}</h1>
                case 3:
                    return <h3 className="text-xl font-bold font-display mt-6 mb-3">{block.content}</h3>
                default:
                    return <h2 className="text-2xl font-bold font-display mt-8 mb-4">{block.content}</h2>
            }
        }

        case 'paragraph':
            return (
                <p className="text-base leading-relaxed text-tx-sec mb-4">
                    {block.content}
                </p>
            )

        case 'image':
            return (
                <figure className="my-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={block.src || ''}
                        alt={block.alt || ''}
                        loading="lazy"
                        className="w-full rounded-2xl border border-sf-2"
                    />
                    {block.alt && (
                        <figcaption className="text-sm text-tx-muted text-center mt-2">
                            {block.alt}
                        </figcaption>
                    )}
                </figure>
            )

        case 'divider':
            return <hr className="border-t border-sf-3 my-8" />

        case 'callout': {
            const variants = {
                info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
                warning: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-950 dark:border-warning-800 dark:text-warning-200',
                success: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-950 dark:border-success-800 dark:text-success-200',
                error: 'bg-error-50 border-error-200 text-error-800 dark:bg-error-950 dark:border-error-800 dark:text-error-200',
            }
            const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
            const v = block.variant || 'info'
            return (
                <div className={`rounded-xl border p-4 my-4 ${variants[v]}`}>
                    <span className="mr-2">{icons[v]}</span>
                    {block.content}
                </div>
            )
        }

        case 'list': {
            const items = block.content.split('\n').filter(Boolean)
            const Tag = block.ordered ? 'ol' : 'ul'
            return (
                <Tag className={`my-4 pl-6 space-y-1 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
                    {items.map((item, i) => (
                        <li key={i} className="text-base text-tx-sec">{item}</li>
                    ))}
                </Tag>
            )
        }

        case 'quote':
            return (
                <blockquote className="border-l-4 border-brand pl-4 my-6 italic text-tx-muted text-lg">
                    {block.content}
                </blockquote>
            )

        case 'code':
            return (
                <pre className="bg-gray-900 text-green-400 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono">
                    <code>{block.content}</code>
                </pre>
            )

        case 'button':
            return (
                <div className="my-6">
                    <a
                        href={block.href || '#'}
                        className="inline-block px-8 py-3 rounded-full bg-brand text-white font-medium hover:bg-brand-light transition-colors shadow-lg shadow-brand-soft"
                    >
                        {block.content}
                    </a>
                </div>
            )

        default:
            return null
    }
}
