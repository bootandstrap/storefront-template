'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

interface Category {
    id: string
    name: string
    handle: string
    description?: string | null
    category_children?: Category[]
}

interface MegaMenuProps {
    categories: Category[]
    /** Label for the trigger button */
    label: string
}

/**
 * MegaMenu — dropdown navigation for product categories
 *
 * Renders a grid of category links in a dropdown panel.
 * Supports one level of nesting (subcategories).
 * Opens on hover (desktop) and click (mobile).
 */
export default function MegaMenu({ categories, label }: MegaMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const { locale } = useI18n()

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen])

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 200)
    }

    if (categories.length === 0) return null

    return (
        <div
            ref={menuRef}
            className="mega-menu-container"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trigger */}
            <button
                className="mega-menu-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {label}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="mega-menu-dropdown animate-slide-up">
                    <div className="mega-menu-grid">
                        {categories.map((category) => (
                            <div key={category.id} className="mega-menu-group">
                                <Link
                                    href={`/${locale}/productos?category=${encodeURIComponent(category.name)}`}
                                    className="mega-menu-category"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {category.name}
                                </Link>

                                {category.category_children && category.category_children.length > 0 && (
                                    <ul className="mega-menu-subcategories">
                                        {category.category_children.map((sub) => (
                                            <li key={sub.id}>
                                                <Link
                                                    href={`/${locale}/productos?category=${encodeURIComponent(sub.name)}`}
                                                    className="mega-menu-subcategory"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    {sub.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
