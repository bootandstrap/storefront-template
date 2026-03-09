'use client'

import { Share2, Copy, Check, MessageCircle } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/provider'

interface SocialShareProps {
    url: string
    title: string
    description?: string
}

export default function SocialShare({ url, title, description }: SocialShareProps) {
    const { t } = useI18n()
    const [copied, setCopied] = useState(false)

    const shareText = `${title}${description ? ` — ${description}` : ''}`

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input')
            input.value = url
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            document.body.removeChild(input)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }, [url])

    const handleNativeShare = useCallback(async () => {
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
            try {
                await navigator.share({ title, text: description, url })
            } catch {
                // User cancelled — ignore
            }
        }
    }, [title, description, url])

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`
    const supportsNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted mr-1">{t('share.label')}</span>

            {/* WhatsApp */}
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 flex items-center justify-center transition-colors"
                aria-label={t('share.whatsapp')}
            >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </a>

            {/* Copy link */}
            <button
                onClick={handleCopy}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label={copied ? t('share.copied') : t('share.copyLink')}
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                ) : (
                    <Copy className="w-4 h-4 text-text-muted" />
                )}
            </button>

            {/* Native share (mobile) */}
            {supportsNativeShare && (
                <button
                    onClick={handleNativeShare}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    aria-label={t('share.native')}
                >
                    <Share2 className="w-4 h-4 text-text-muted" />
                </button>
            )}
        </div>
    )
}
