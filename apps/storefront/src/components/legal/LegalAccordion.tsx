'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
    id: string
    icon?: ReactNode
    title: string
    content: ReactNode
    defaultOpen?: boolean
}

interface LegalAccordionProps {
    items: AccordionItem[]
    allowMultiple?: boolean
}

export default function LegalAccordion({ items, allowMultiple = false }: LegalAccordionProps) {
    const [openIds, setOpenIds] = useState<Set<string>>(
        new Set(items.filter(i => i.defaultOpen).map(i => i.id))
    )

    function toggle(id: string) {
        setOpenIds(prev => {
            const next = new Set(allowMultiple ? prev : [])
            if (prev.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    return (
        <div className="space-y-2">
            {items.map(item => {
                const isOpen = openIds.has(item.id)
                return (
                    <div
                        key={item.id}
                        className="glass rounded-xl overflow-hidden border border-white/5 transition-all"
                    >
                        <button
                            onClick={() => toggle(item.id)}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-sf-2/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
                            aria-expanded={isOpen}
                            aria-controls={`accordion-panel-${item.id}`}
                            id={`accordion-header-${item.id}`}
                        >
                            {item.icon && (
                                <span className="w-8 h-8 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0 text-brand">
                                    {item.icon}
                                </span>
                            )}
                            <span className="text-sm font-semibold text-tx flex-1">{item.title}</span>
                            <ChevronDown
                                className={`w-4 h-4 text-tx-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <div
                            id={`accordion-panel-${item.id}`}
                            role="region"
                            aria-labelledby={`accordion-header-${item.id}`}
                            className={`transition-all duration-200 ease-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
                        >
                            <div className="px-5 pb-5 pt-1 text-sm text-tx-sec leading-relaxed space-y-3">
                                {item.content}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
