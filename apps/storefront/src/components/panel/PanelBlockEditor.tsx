'use client'

/**
 * PanelBlockEditor — Notion-style block editor for CMS pages
 *
 * Block types: heading, paragraph, image, divider, callout, list, quote, code, button
 * Features:
 *   - Slash commands (/) to insert blocks
 *   - Drag-to-reorder blocks
 *   - Inline formatting (bold, italic)
 *   - Export to HTML for storefront rendering
 *
 * Usage:
 *   <PanelBlockEditor
 *     blocks={initialBlocks}
 *     onChange={setBlocks}
 *   />
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import {
    Heading,
    Type,
    ImageIcon,
    Minus,
    AlertCircle,
    List,
    Quote,
    Code,
    MousePointerClick,
    GripVertical,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export type BlockType =
    | 'heading'
    | 'paragraph'
    | 'image'
    | 'divider'
    | 'callout'
    | 'list'
    | 'quote'
    | 'code'
    | 'button'

export interface Block {
    id: string
    type: BlockType
    content: string
    /** For headings: 1-3 */
    level?: number
    /** For images: src URL */
    src?: string
    /** For images: alt text */
    alt?: string
    /** For callout: variant */
    variant?: 'info' | 'warning' | 'success' | 'error'
    /** For button: href */
    href?: string
    /** For list: ordered or unordered */
    ordered?: boolean
}

interface PanelBlockEditorProps {
    blocks: Block[]
    onChange: (blocks: Block[]) => void
    /** Placeholder for empty state */
    placeholder?: string
    /** Read-only mode */
    readOnly?: boolean
    /** Additional className */
    className?: string
}

// ─── Block type config ──────────────────────────────────────────────────────

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'heading', label: 'Encabezado', icon: <Heading className="w-4 h-4" />, description: 'Título destacado' },
    { type: 'paragraph', label: 'Párrafo', icon: <Type className="w-4 h-4" />, description: 'Texto normal' },
    { type: 'image', label: 'Imagen', icon: <ImageIcon className="w-4 h-4" />, description: 'Imagen con alt text' },
    { type: 'divider', label: 'Separador', icon: <Minus className="w-4 h-4" />, description: 'Línea divisora' },
    { type: 'callout', label: 'Aviso', icon: <AlertCircle className="w-4 h-4" />, description: 'Caja informativa' },
    { type: 'list', label: 'Lista', icon: <List className="w-4 h-4" />, description: 'Lista de elementos' },
    { type: 'quote', label: 'Cita', icon: <Quote className="w-4 h-4" />, description: 'Bloque de cita' },
    { type: 'code', label: 'Código', icon: <Code className="w-4 h-4" />, description: 'Bloque de código' },
    { type: 'button', label: 'Botón', icon: <MousePointerClick className="w-4 h-4" />, description: 'Botón con enlace' },
]

function generateId(): string {
    return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createBlock(type: BlockType): Block {
    return {
        id: generateId(),
        type,
        content: '',
        ...(type === 'heading' && { level: 2 }),
        ...(type === 'callout' && { variant: 'info' as const }),
        ...(type === 'list' && { ordered: false }),
    }
}

// ─── Slash Command Menu ─────────────────────────────────────────────────────

function SlashMenu({
    position,
    filter,
    onSelect,
    onClose,
}: {
    position: { top: number; left: number }
    filter: string
    onSelect: (type: BlockType) => void
    onClose: () => void
}) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)

    const filtered = BLOCK_TYPES.filter(bt =>
        bt.label.toLowerCase().includes(filter.toLowerCase()) ||
        bt.type.includes(filter.toLowerCase())
    )

    useEffect(() => {
        setSelectedIndex(0)
    }, [filter])

    useEffect(() => {
        const handler = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(i => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[selectedIndex]) {
                    onSelect(filtered[selectedIndex].type)
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [filtered, selectedIndex, onSelect, onClose])

    if (filtered.length === 0) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-sf-0/50 backdrop-blur-md shadow-xl border border-sf-3/30 rounded-xl py-1.5 w-[240px] animate-fade-in-up"
            style={{ top: position.top, left: position.left }}
        >
            <p className="px-3 py-1 text-[10px] text-tx-faint uppercase tracking-wider font-semibold">
                Bloques
            </p>
            {filtered.map((bt, i) => (
                <button
                    key={bt.type}
                    type="button"
                    onClick={() => onSelect(bt.type)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        i === selectedIndex ? 'bg-brand-subtle text-brand' : 'text-tx hover:bg-sf-1'
                    }`}
                >
                    <span className="shrink-0 w-8 h-8 rounded-lg bg-sf-1 flex items-center justify-center">
                        {bt.icon}
                    </span>
                    <div>
                        <p className="text-sm font-medium">{bt.label}</p>
                        <p className="text-[11px] text-tx-faint">{bt.description}</p>
                    </div>
                </button>
            ))}
        </div>
    )
}

// ─── Block Renderer ─────────────────────────────────────────────────────────

function BlockEditor({
    block,
    onChange,
    onDelete,
    onMoveUp,
    onMoveDown,
    onAddAfter,
    isFirst,
    isLast,
    readOnly,
}: {
    block: Block
    onChange: (updated: Block) => void
    onDelete: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    onAddAfter: () => void
    isFirst: boolean
    isLast: boolean
    readOnly?: boolean
}) {
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

    const updateField = <K extends keyof Block>(k: K, v: Block[K]) => {
        onChange({ ...block, [k]: v })
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        if (e.key === 'Backspace' && block.content === '' && block.type !== 'divider') {
            e.preventDefault()
            onDelete()
        }
        if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code' && block.type !== 'list') {
            e.preventDefault()
            onAddAfter()
        }
    }

    const commonClass = 'w-full bg-transparent text-tx focus:outline-none resize-none'

    return (
        <div className="group relative flex items-start gap-1 py-1">
            {/* Drag handle + controls */}
            {!readOnly && (
                <div className="shrink-0 w-7 flex flex-col items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={onMoveUp}
                        disabled={isFirst}
                        className="p-0.5 rounded text-tx-faint hover:text-tx disabled:opacity-30"
                        aria-label="Move up"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <GripVertical className="w-3.5 h-3.5 text-tx-faint cursor-grab" />
                    <button
                        type="button"
                        onClick={onMoveDown}
                        disabled={isLast}
                        className="p-0.5 rounded text-tx-faint hover:text-tx disabled:opacity-30"
                        aria-label="Move down"
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Block content */}
            <div className="flex-1 min-w-0">
                {block.type === 'heading' && (
                    <div className="flex items-center gap-2">
                        <select
                            value={block.level || 2}
                            onChange={e => updateField('level', Number(e.target.value))}
                            disabled={readOnly}
                            className="shrink-0 px-1.5 py-1 rounded-lg border border-sf-3 bg-sf-0 text-xs text-tx-muted focus:outline-none"
                        >
                            <option value={1}>H1</option>
                            <option value={2}>H2</option>
                            <option value={3}>H3</option>
                        </select>
                        <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            value={block.content}
                            onChange={e => updateField('content', e.target.value)}
                            onKeyDown={handleKeyDown}
                            readOnly={readOnly}
                            placeholder="Encabezado..."
                            className={`${commonClass} text-lg font-bold font-display`}
                        />
                    </div>
                )}

                {block.type === 'paragraph' && (
                    <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={block.content}
                        onChange={e => updateField('content', e.target.value)}
                        onKeyDown={handleKeyDown}
                        readOnly={readOnly}
                        placeholder="Escribe algo o pulsa / para más opciones..."
                        rows={Math.max(1, block.content.split('\n').length)}
                        className={`${commonClass} text-sm leading-relaxed`}
                    />
                )}

                {block.type === 'image' && (
                    <div className="space-y-2">
                        <input
                            value={block.src || ''}
                            onChange={e => updateField('src', e.target.value)}
                            readOnly={readOnly}
                            placeholder="URL de la imagen..."
                            className={`${commonClass} text-sm px-3 py-2 rounded-lg border border-sf-3 bg-sf-0`}
                        />
                        {block.src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={block.src} alt={block.alt || ''} className="max-w-full rounded-xl border border-sf-2" />
                        )}
                        <input
                            value={block.alt || ''}
                            onChange={e => updateField('alt', e.target.value)}
                            readOnly={readOnly}
                            placeholder="Texto alternativo (alt)..."
                            className={`${commonClass} text-xs text-tx-muted px-3 py-1.5 rounded-lg border border-sf-3 bg-sf-0`}
                        />
                    </div>
                )}

                {block.type === 'divider' && (
                    <hr className="border-t-2 border-sf-3 my-2" />
                )}

                {block.type === 'callout' && (
                    <div className={`rounded-xl p-4 border ${
                        block.variant === 'warning' ? 'bg-warning-50 border-warning-200 dark:bg-warning-950 dark:border-warning-800' :
                        block.variant === 'error' ? 'bg-error-50 border-error-200 dark:bg-error-950 dark:border-error-800' :
                        block.variant === 'success' ? 'bg-success-50 border-success-200 dark:bg-success-950 dark:border-success-800' :
                        'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                    }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <select
                                value={block.variant || 'info'}
                                onChange={e => updateField('variant', e.target.value as Block['variant'])}
                                disabled={readOnly}
                                className="px-2 py-1 rounded-lg border border-sf-3 bg-sf-0 text-xs text-tx-muted focus:outline-none"
                            >
                                <option value="info">ℹ️ Info</option>
                                <option value="warning">⚠️ Aviso</option>
                                <option value="success">✅ Éxito</option>
                                <option value="error">❌ Error</option>
                            </select>
                        </div>
                        <textarea
                            value={block.content}
                            onChange={e => updateField('content', e.target.value)}
                            onKeyDown={handleKeyDown}
                            readOnly={readOnly}
                            placeholder="Texto del aviso..."
                            rows={2}
                            className={`${commonClass} text-sm`}
                        />
                    </div>
                )}

                {block.type === 'list' && (
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                type="button"
                                onClick={() => updateField('ordered', !block.ordered)}
                                disabled={readOnly}
                                className="text-[11px] text-tx-muted hover:text-tx px-2 py-0.5 rounded border border-sf-3"
                            >
                                {block.ordered ? '1. Numerada' : '• Viñetas'}
                            </button>
                        </div>
                        <textarea
                            value={block.content}
                            onChange={e => updateField('content', e.target.value)}
                            readOnly={readOnly}
                            placeholder="Un elemento por línea..."
                            rows={Math.max(3, block.content.split('\n').length)}
                            className={`${commonClass} text-sm leading-relaxed pl-4`}
                        />
                    </div>
                )}

                {block.type === 'quote' && (
                    <div className="border-l-4 border-brand pl-4">
                        <textarea
                            value={block.content}
                            onChange={e => updateField('content', e.target.value)}
                            onKeyDown={handleKeyDown}
                            readOnly={readOnly}
                            placeholder="Texto de la cita..."
                            rows={2}
                            className={`${commonClass} text-sm italic leading-relaxed`}
                        />
                    </div>
                )}

                {block.type === 'code' && (
                    <textarea
                        value={block.content}
                        onChange={e => updateField('content', e.target.value)}
                        readOnly={readOnly}
                        placeholder="// código..."
                        rows={Math.max(3, block.content.split('\n').length)}
                        className={`${commonClass} text-sm font-mono bg-gray-900 text-green-400 rounded-xl p-4 dark:bg-gray-950`}
                    />
                )}

                {block.type === 'button' && (
                    <div className="space-y-2">
                        <input
                            value={block.content}
                            onChange={e => updateField('content', e.target.value)}
                            onKeyDown={handleKeyDown}
                            readOnly={readOnly}
                            placeholder="Texto del botón..."
                            className={`${commonClass} text-sm font-medium px-3 py-2 rounded-lg border border-sf-3 bg-sf-0`}
                        />
                        <input
                            value={block.href || ''}
                            onChange={e => updateField('href', e.target.value)}
                            readOnly={readOnly}
                            placeholder="URL de destino..."
                            className={`${commonClass} text-xs text-tx-muted px-3 py-1.5 rounded-lg border border-sf-3 bg-sf-0`}
                        />
                        {block.content && (
                            <div className="pt-1">
                                <span className="inline-block px-6 py-2.5 rounded-full bg-brand text-white text-sm font-medium">
                                    {block.content}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete button */}
            {!readOnly && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="shrink-0 p-1 rounded-lg text-tx-faint hover:text-error-500 hover:bg-error-50 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Delete block"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    )
}

// ─── Main Editor ────────────────────────────────────────────────────────────

export default function PanelBlockEditor({
    blocks,
    onChange,
    placeholder = 'Pulsa / para empezar a escribir...',
    readOnly = false,
    className = '',
}: PanelBlockEditorProps) {
    const [slashMenu, setSlashMenu] = useState<{ index: number; position: { top: number; left: number }; filter: string } | null>(null)
    const editorRef = useRef<HTMLDivElement>(null)

    const updateBlock = useCallback((index: number, updated: Block) => {
        const newBlocks = [...blocks]
        newBlocks[index] = updated

        // Detect slash command
        if (updated.type === 'paragraph' && updated.content.startsWith('/')) {
            const rect = editorRef.current?.children[index]?.getBoundingClientRect()
            if (rect) {
                setSlashMenu({
                    index,
                    position: { top: rect.bottom + 4, left: rect.left },
                    filter: updated.content.slice(1),
                })
            }
        } else if (slashMenu) {
            setSlashMenu(null)
        }

        onChange(newBlocks)
    }, [blocks, onChange, slashMenu])

    const deleteBlock = useCallback((index: number) => {
        if (blocks.length <= 1) return
        const newBlocks = blocks.filter((_, i) => i !== index)
        onChange(newBlocks)
    }, [blocks, onChange])

    const moveBlock = useCallback((from: number, to: number) => {
        if (to < 0 || to >= blocks.length) return
        const newBlocks = [...blocks]
        const [moved] = newBlocks.splice(from, 1)
        newBlocks.splice(to, 0, moved)
        onChange(newBlocks)
    }, [blocks, onChange])

    const addBlockAfter = useCallback((index: number, type: BlockType = 'paragraph') => {
        const newBlock = createBlock(type)
        const newBlocks = [...blocks]
        newBlocks.splice(index + 1, 0, newBlock)
        onChange(newBlocks)
        setSlashMenu(null)
    }, [blocks, onChange])

    const handleSlashSelect = useCallback((type: BlockType) => {
        if (!slashMenu) return
        const newBlocks = [...blocks]
        newBlocks[slashMenu.index] = createBlock(type)
        onChange(newBlocks)
        setSlashMenu(null)
    }, [blocks, onChange, slashMenu])

    return (
        <div className={`relative ${className}`}>
            <div ref={editorRef} className="space-y-1">
                {blocks.length === 0 ? (
                    <div className="text-sm text-tx-faint py-4 text-center">
                        {placeholder}
                    </div>
                ) : (
                    blocks.map((block, i) => (
                        <BlockEditor
                            key={block.id}
                            block={block}
                            onChange={updated => updateBlock(i, updated)}
                            onDelete={() => deleteBlock(i)}
                            onMoveUp={() => moveBlock(i, i - 1)}
                            onMoveDown={() => moveBlock(i, i + 1)}
                            onAddAfter={() => addBlockAfter(i)}
                            isFirst={i === 0}
                            isLast={i === blocks.length - 1}
                            readOnly={readOnly}
                        />
                    ))
                )}
            </div>

            {/* Add block button */}
            {!readOnly && (
                <button
                    type="button"
                    onClick={() => addBlockAfter(blocks.length - 1)}
                    className="mt-3 w-full py-2 rounded-xl border-2 border-dashed border-sf-3 text-tx-faint hover:border-brand hover:text-brand text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Añadir bloque
                </button>
            )}

            {/* Slash command menu */}
            {slashMenu && (
                <SlashMenu
                    position={slashMenu.position}
                    filter={slashMenu.filter}
                    onSelect={handleSlashSelect}
                    onClose={() => setSlashMenu(null)}
                />
            )}
        </div>
    )
}

// ─── Export: blocksToHTML ────────────────────────────────────────────────────

export function blocksToHTML(blocks: Block[]): string {
    return blocks.map(block => {
        switch (block.type) {
            case 'heading': {
                const tag = `h${block.level || 2}`
                return `<${tag}>${escapeHtml(block.content)}</${tag}>`
            }
            case 'paragraph':
                return `<p>${escapeHtml(block.content)}</p>`
            case 'image':
                return `<figure><img src="${escapeHtml(block.src || '')}" alt="${escapeHtml(block.alt || '')}" loading="lazy" />${block.alt ? `<figcaption>${escapeHtml(block.alt)}</figcaption>` : ''}</figure>`
            case 'divider':
                return '<hr />'
            case 'callout':
                return `<div class="callout callout-${block.variant || 'info'}">${escapeHtml(block.content)}</div>`
            case 'list': {
                const tag = block.ordered ? 'ol' : 'ul'
                const items = block.content.split('\n').filter(Boolean).map(item => `<li>${escapeHtml(item)}</li>`).join('')
                return `<${tag}>${items}</${tag}>`
            }
            case 'quote':
                return `<blockquote>${escapeHtml(block.content)}</blockquote>`
            case 'code':
                return `<pre><code>${escapeHtml(block.content)}</code></pre>`
            case 'button':
                return `<a href="${escapeHtml(block.href || '#')}" class="cta-button">${escapeHtml(block.content)}</a>`
            default:
                return ''
        }
    }).join('\n')
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
