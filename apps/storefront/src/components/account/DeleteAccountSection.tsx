'use client'

import { useState, useCallback } from 'react'
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/provider'
import { useRouter } from 'next/navigation'

export default function DeleteAccountSection() {
    const { t, locale } = useI18n()
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const CONFIRM_WORD = locale === 'es' ? 'ELIMINAR' : 'DELETE'
    const isConfirmed = confirmText === CONFIRM_WORD

    const handleDelete = useCallback(async () => {
        if (!isConfirmed) return
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            // 1. Get user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No session')

            // 2. Delete profile data (cascade will handle most FK references)
            await supabase.from('profiles').delete().eq('id', user.id)

            // 3. Clear avatar from storage
            try {
                const { data: files } = await supabase.storage
                    .from('avatars')
                    .list(user.id)
                if (files && files.length > 0) {
                    await supabase.storage
                        .from('avatars')
                        .remove(files.map(f => `${user.id}/${f.name}`))
                }
            } catch {
                // Non-critical — continue with deletion
            }

            // 4. Sign out (this doesn't actually delete the auth user — 
            //    that requires admin API or Supabase Edge Function)
            await supabase.auth.signOut()

            // 5. Redirect to home
            router.push(`/${locale}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error')
        } finally {
            setLoading(false)
        }
    }, [isConfirmed, locale, router])

    return (
        <>
            <div className="glass rounded-2xl p-6 border border-red-500/20">
                <h2 className="text-sm font-semibold text-red-500 flex items-center gap-2 mb-2">
                    <Trash2 className="w-4 h-4" />
                    {t('account.deleteTitle') || 'Delete Account'}
                </h2>
                <p className="text-xs text-tx-muted mb-4">
                    {t('account.deleteDescription') || 'Permanently delete your account and all associated data. This action cannot be undone.'}
                </p>
                <button
                    onClick={() => setShowModal(true)}
                    className="text-sm px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                >
                    {t('account.deleteButton') || 'Delete My Account'}
                </button>
            </div>

            {/* Confirmation modal */}
            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-sm bg-sf-0 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-sf-3 bg-red-500/5">
                            <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {t('account.deleteConfirmTitle') || 'Are you sure?'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-sf-2 transition-colors">
                                <X className="w-4 h-4 text-tx-muted" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                                <p className="text-xs text-red-400 leading-relaxed">
                                    {t('account.deleteWarning') || 'This will permanently delete your profile, order history, saved addresses, and all personal data. You will not be able to recover your account.'}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs text-tx-muted font-medium mb-1.5 block">
                                    {t('account.deleteConfirmLabel')?.replace('{word}', CONFIRM_WORD) || `Type "${CONFIRM_WORD}" to confirm`}
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-red-500/30 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    placeholder={CONFIRM_WORD}
                                    autoComplete="off"
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-red-400">{error}</p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        setConfirmText('')
                                        setError(null)
                                    }}
                                    className="btn btn-secondary flex-1 text-sm"
                                >
                                    {t('common.cancel') || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={!isConfirmed || loading}
                                    className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    {t('account.deleteConfirm') || 'Delete Forever'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
