'use client'

/**
 * PanelKeyboardShortcuts — Global keyboard shortcuts overlay
 *
 * Press `?` anywhere (outside inputs) to see all available shortcuts.
 * Renders as a modal with grouped shortcut listings.
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Command } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShortcutGroup {
    title: string
    shortcuts: { keys: string[]; description: string }[]
}

interface PanelKeyboardShortcutsProps {
    groups: ShortcutGroup[]
    title?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelKeyboardShortcuts({ groups, title = 'Atajos de teclado' }: PanelKeyboardShortcutsProps) {
    const [open, setOpen] = useState(false)

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger in inputs/textareas
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

        if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            setOpen(prev => !prev)
        }

        if (e.key === 'Escape' && open) {
            setOpen(false)
        }
    }, [open])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-label="Close shortcuts"
            />

            {/* Modal */}
            <div className="relative mx-auto mt-[10vh] w-full max-w-2xl px-4">
                <div className="bg-sf-1 border border-sf-3 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-sf-2">
                        <h2 className="text-base font-semibold text-tx">{title}</h2>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-sf-2 text-tx-muted transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map((group, gi) => (
                                <div key={gi}>
                                    <h3 className="text-xs font-semibold text-tx-faint uppercase tracking-wider mb-3">
                                        {group.title}
                                    </h3>
                                    <div className="space-y-2">
                                        {group.shortcuts.map((shortcut, si) => (
                                            <div key={si} className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-tx-sec">{shortcut.description}</span>
                                                <div className="flex items-center gap-1">
                                                    {shortcut.keys.map((key, ki) => (
                                                        <kbd
                                                            key={ki}
                                                            className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-tx-muted bg-sf-2 rounded border border-sf-3 min-w-[24px] justify-center"
                                                        >
                                                            {key === '⌘' ? (
                                                                <Command className="w-3 h-3" />
                                                            ) : (
                                                                key
                                                            )}
                                                        </kbd>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-sf-2 flex items-center justify-between">
                        <span className="text-[10px] text-tx-faint">
                            Presiona <kbd className="px-1 py-0.5 bg-sf-2 rounded border border-sf-3 text-[10px]">?</kbd> para abrir/cerrar
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Default panel shortcuts config
// ---------------------------------------------------------------------------

export const DEFAULT_PANEL_SHORTCUTS: ShortcutGroup[] = [
    {
        title: 'Navegación',
        shortcuts: [
            { keys: ['⌘', 'K'], description: 'Búsqueda global' },
            { keys: ['?'], description: 'Atajos de teclado' },
            { keys: ['Esc'], description: 'Cerrar modal/menú' },
        ],
    },
    {
        title: 'Acciones',
        shortcuts: [
            { keys: ['N'], description: 'Nuevo producto' },
            { keys: ['/'], description: 'Enfocar búsqueda' },
            { keys: ['⌘', 'S'], description: 'Guardar cambios' },
        ],
    },
    {
        title: 'Panel',
        shortcuts: [
            { keys: ['['], description: 'Colapsar sidebar' },
            { keys: ['G', 'D'], description: 'Ir al dashboard' },
            { keys: ['G', 'C'], description: 'Ir al catálogo' },
            { keys: ['G', 'O'], description: 'Ir a pedidos' },
        ],
    },
    {
        title: 'Tabla',
        shortcuts: [
            { keys: ['↑', '↓'], description: 'Navegar filas' },
            { keys: ['Enter'], description: 'Abrir detalle' },
            { keys: ['⌘', 'A'], description: 'Seleccionar todos' },
        ],
    },
]
