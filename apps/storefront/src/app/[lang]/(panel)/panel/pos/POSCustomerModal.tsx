'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Search, UserPlus, User, Mail, Phone, ShoppingBag, Loader2, UserX } from 'lucide-react'
import type { POSCustomerResult } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

interface POSCustomerModalProps {
    onClose: () => void
    onSelect: (customer: { id: string; name: string } | null) => void
    labels: Record<string, string>
}

const RECENT_KEY = 'pos_recent_customers'

function getRecentCustomers(): POSCustomerResult[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY)
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function saveRecentCustomer(customer: POSCustomerResult) {
    try {
        const recent = getRecentCustomers().filter(c => c.id !== customer.id)
        recent.unshift(customer)
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)))
    } catch { /* */ }
}

export default function POSCustomerModal({ onClose, onSelect, labels }: POSCustomerModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<POSCustomerResult[]>([])
    const [loading, setLoading] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [recent] = useState<POSCustomerResult[]>(() => getRecentCustomers())

    // Create form
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [createError, setCreateError] = useState('')

    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

    useEffect(() => { inputRef.current?.focus() }, [])

    // ── Debounced search ──
    const doSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) { setResults([]); return }
        setLoading(true)
        try {
            const { searchPOSCustomersAction } = await import('@/lib/pos/customers/customer-actions')
            const { customers } = await searchPOSCustomersAction(q)
            setResults(customers)
        } catch { setResults([]) }
        setLoading(false)
    }, [])

    const handleQueryChange = useCallback((value: string) => {
        setQuery(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doSearch(value), 350)
    }, [doSearch])

    // ── Select customer ──
    const handleSelect = useCallback((customer: POSCustomerResult) => {
        saveRecentCustomer(customer)
        const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
        onSelect({ id: customer.id, name })
    }, [onSelect])

    // ── Walk-in (no customer) ──
    const handleWalkIn = useCallback(() => {
        onSelect(null)
    }, [onSelect])

    // ── Quick create ──
    const handleCreate = useCallback(async () => {
        if (!firstName.trim() || !email.trim()) {
            setCreateError(posLabel('panel.pos.nameEmailRequired', labels))
            return
        }
        setCreating(true)
        setCreateError('')
        try {
            const { createPOSCustomerAction } = await import('@/lib/pos/customers/customer-actions')
            const { customer, error } = await createPOSCustomerAction({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
            })
            if (error) { setCreateError(error); setCreating(false); return }
            if (customer) {
                saveRecentCustomer(customer)
                const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
                onSelect({ id: customer.id, name })
            }
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Error')
        }
        setCreating(false)
    }, [firstName, lastName, email, phone, onSelect])

    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={labels['panel.pos.selectCustomer'] || 'Select customer'}
        >
            <div className="bg-sf-0 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2">
                    <h3 className="text-base font-bold text-tx flex items-center gap-2">
                        <User className="w-5 h-5 text-brand" />
                        {labels['panel.pos.selectCustomer'] || 'Seleccionar cliente'}
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close'}
                        className="p-1.5 rounded-lg hover:bg-sf-1 text-tx-sec min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {!showCreate ? (
                    <>
                        {/* Search */}
                        <div className="px-5 pt-4 pb-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => handleQueryChange(e.target.value)}
                                    placeholder={labels['panel.pos.searchCustomer'] || 'Buscar por nombre o email...'}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-sf-1 border border-sf-2
                                               text-sm text-tx placeholder:text-tx-muted
                                               focus:outline-none focus:ring-2 focus:ring-soft"
                                />
                                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted animate-spin" />}
                            </div>
                        </div>

                        {/* Results / Recent */}
                        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1">
                            {/* Search results */}
                            {query.length >= 2 && results.length > 0 && results.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelect(c)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                               hover:bg-sf-1 transition-colors group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-brand" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-tx truncate">
                                            {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-tx-muted">
                                            <Mail className="w-3 h-3 flex-shrink-0" /> {c.email}
                                            {c.orders_count > 0 && (
                                                <>
                                                    <span>·</span>
                                                    <ShoppingBag className="w-3 h-3 flex-shrink-0" />
                                                    {c.orders_count} pedidos
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {/* No results */}
                            {query.length >= 2 && !loading && results.length === 0 && (
                                <div className="text-center py-6 text-sm text-tx-muted">
                                    {posLabel('panel.pos.noCustomersFound', labels)}
                                </div>
                            )}

                            {/* Recent customers (shown when no search) */}
                            {query.length < 2 && recent.length > 0 && (
                                <>
                                    <p className="text-[11px] font-medium text-tx-muted uppercase tracking-wider px-1 pt-2 pb-1">
                                        {posLabel('panel.pos.recent', labels)}
                                    </p>
                                    {recent.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleSelect(c)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                                                       hover:bg-sf-1 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-sf-2 flex items-center justify-center flex-shrink-0">
                                                <User className="w-3.5 h-3.5 text-tx-muted" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-tx truncate">
                                                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                                                </p>
                                                <p className="text-[11px] text-tx-muted truncate">{c.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-sf-2 flex gap-2">
                            <button
                                onClick={handleWalkIn}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px]
                                           bg-sf-1 text-tx-sec text-sm font-medium
                                           hover:bg-sf-2 transition-colors
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            >
                                <UserX className="w-4 h-4" />
                                {posLabel('panel.pos.walkIn', labels)}
                            </button>
                            <button
                                onClick={() => setShowCreate(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px]
                                           bg-brand text-white text-sm font-medium
                                           hover:bg-brand transition-colors
                                           focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none"
                            >
                                <UserPlus className="w-4 h-4" />
                                {posLabel('panel.pos.createNew', labels)}
                            </button>
                        </div>
                    </>
                ) : (
                    /* Create form */
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-tx flex items-center gap-2 mb-4">
                            <UserPlus className="w-4 h-4 text-brand" />
                            {posLabel('panel.pos.newCustomer', labels)}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-medium text-tx-muted block mb-1">{posLabel('panel.pos.firstName', labels)} *</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-sf-1 border border-sf-2 text-sm
                                               text-tx focus:outline-none focus:ring-2 focus:ring-soft"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-tx-muted block mb-1">{posLabel('panel.pos.lastName', labels)}</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-sf-1 border border-sf-2 text-sm
                                               text-tx focus:outline-none focus:ring-2 focus:ring-soft"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-medium text-tx-muted block mb-1 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-sf-1 border border-sf-2 text-sm
                                           text-tx focus:outline-none focus:ring-2 focus:ring-soft"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-medium text-tx-muted block mb-1 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Teléfono
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-sf-1 border border-sf-2 text-sm
                                           text-tx focus:outline-none focus:ring-2 focus:ring-soft"
                            />
                        </div>

                        {createError && (
                            <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{createError}</p>
                        )}

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-2.5 rounded-xl bg-sf-1 text-tx-sec
                                           text-sm font-medium hover:bg-sf-2 transition-colors"
                            >
                                {posLabel('panel.pos.back', labels)}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="flex-1 py-2.5 rounded-xl bg-brand text-white
                                           text-sm font-medium hover:bg-brand transition-colors
                                           disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                {creating ? posLabel('panel.pos.creating', labels) : posLabel('panel.pos.createAndSelect', labels)}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
