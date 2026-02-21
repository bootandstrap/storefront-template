'use client'

import { useState, useCallback } from 'react'
import { Mail, CheckCircle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

// ---------------------------------------------------------------------------
// Newsletter Signup — footer inline component
// Gated by `enable_newsletter` feature flag
// Stores email in Supabase `newsletter_subscribers` table
// ---------------------------------------------------------------------------

export default function NewsletterSignup() {
    const { t } = useI18n()
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || status === 'loading') return

        setStatus('loading')

        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            })

            const data = await res.json()

            if (res.ok) {
                setStatus('success')
                setMessage(t('newsletter.success') || '¡Suscrito! Gracias por unirte.')
                setEmail('')
            } else {
                setStatus('error')
                setMessage(data.error || t('newsletter.error') || 'Error al suscribir. Inténtalo de nuevo.')
            }
        } catch {
            setStatus('error')
            setMessage(t('newsletter.error') || 'Error al suscribir. Inténtalo de nuevo.')
        }

        // Reset after delay
        setTimeout(() => {
            setStatus('idle')
            setMessage('')
        }, 5000)
    }, [email, status, t])

    return (
        <div className="w-full max-w-md">
            <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                {t('newsletter.title') || 'Newsletter'}
            </h4>
            <p className="text-xs text-text-muted mb-3">
                {t('newsletter.description') || 'Suscríbete para recibir novedades y ofertas exclusivas.'}
            </p>

            {status === 'success' ? (
                <div className="flex items-center gap-2 text-green-500 text-sm animate-fade-in">
                    <CheckCircle className="w-4 h-4" />
                    {message}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('newsletter.placeholder') || 'tu@email.com'}
                        required
                        className="flex-1 px-3 py-2 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all min-w-0"
                    />
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn btn-primary text-xs px-4 py-2 rounded-xl shrink-0 flex items-center gap-1.5"
                    >
                        {status === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Mail className="w-3.5 h-3.5" />
                        )}
                        {t('newsletter.subscribe') || 'Suscribir'}
                    </button>
                </form>
            )}

            {status === 'error' && message && (
                <p className="text-xs text-red-500 mt-2">{message}</p>
            )}
        </div>
    )
}
