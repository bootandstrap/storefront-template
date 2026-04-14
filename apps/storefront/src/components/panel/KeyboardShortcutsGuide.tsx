'use client'

/**
 * KeyboardShortcutsGuide — Modal showing available keyboard shortcuts
 *
 * Invoked with `?` key in the Owner Panel.
 * Lists all navigation and action shortcuts.
 *
 * @module components/panel/KeyboardShortcutsGuide
 */

import { useEffect, useState } from 'react'
import { X, Keyboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Shortcut {
    keys: string[]
    description: string
}

const shortcuts: Shortcut[] = [
    { keys: ['?'], description: 'Mostrar atajos de teclado' },
    { keys: ['⌘', 'K'], description: 'Búsqueda rápida' },
    { keys: ['Esc'], description: 'Cerrar modal / drawer' },
    { keys: ['⌘', '⇧', 'P'], description: 'Ir a Productos' },
    { keys: ['⌘', '⇧', 'O'], description: 'Ir a Pedidos' },
    { keys: ['⌘', '⇧', 'C'], description: 'Ir a Clientes' },
    { keys: ['⌘', '⇧', 'S'], description: 'Ir a Ajustes' },
    { keys: ['⌘', '⇧', 'A'], description: 'Ir a Analíticas' },
]

export default function KeyboardShortcutsGuide() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Don't trigger in inputs/textareas
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

            if (e.key === '?') {
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-md bg-sf-pri border border-brd-pri rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-brd-pri">
                                <div className="flex items-center gap-2.5">
                                    <Keyboard className="w-5 h-5 text-brand" />
                                    <h2 className="text-base font-semibold text-tx-pri">
                                        Atajos de teclado
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-sf-sec transition-colors"
                                >
                                    <X className="w-4 h-4 text-tx-ter" />
                                </button>
                            </div>

                            {/* Shortcuts list */}
                            <div className="p-5 space-y-2.5">
                                {shortcuts.map((shortcut, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-sf-sec/50 transition-colors"
                                    >
                                        <span className="text-sm text-tx-sec">
                                            {shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, j) => (
                                                <kbd
                                                    key={j}
                                                    className="min-w-[24px] h-6 px-1.5 flex items-center justify-center text-xs font-medium text-tx-sec bg-sf-sec border border-brd-pri rounded-md shadow-sm"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-brd-pri bg-sf-sec/30">
                                <p className="text-xs text-tx-ter text-center">
                                    Presiona <kbd className="px-1 py-0.5 rounded bg-sf-sec border border-brd-pri text-[10px]">?</kbd> para cerrar
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
