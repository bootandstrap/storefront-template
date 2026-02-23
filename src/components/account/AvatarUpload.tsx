'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/provider'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AvatarUploadProps {
    userId: string
    currentAvatarUrl: string | null
    userName: string | null
    userEmail: string
    memberSince: string
    onUploadComplete?: (newUrl: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AvatarUpload({
    userId,
    currentAvatarUrl,
    userName,
    userEmail,
    memberSince,
    onUploadComplete,
}: AvatarUploadProps) {
    const { t, locale } = useI18n()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const displayUrl = previewUrl ?? currentAvatarUrl
    const initials = (userName?.[0] ?? userEmail?.[0] ?? '?').toUpperCase()

    // -----------------------------------------------------------------------
    // Handle file selection
    // -----------------------------------------------------------------------

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError(t('avatar.invalidType'))
                return
            }

            // Validate file size (2 MB max)
            if (file.size > 2 * 1024 * 1024) {
                setError(t('avatar.tooLarge'))
                return
            }

            setError(null)

            // Instant preview
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl(objectUrl)

            // Upload
            setUploading(true)
            try {
                const supabase = createClient()

                // Determine extension
                const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
                const filePath = `${userId}/avatar.${ext}`

                // Upload (upsert to overwrite previous)
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, {
                        upsert: true,
                        cacheControl: '3600',
                        contentType: file.type,
                    })

                if (uploadError) {
                    throw new Error(uploadError.message)
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath)

                // Bust browser cache by appending timestamp
                const freshUrl = `${publicUrl}?v=${Date.now()}`

                // Update profile in the database
                const { error: dbError } = await supabase
                    .from('profiles')
                    .update({
                        avatar_url: freshUrl,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', userId)

                if (dbError) {
                    throw new Error(dbError.message)
                }

                setPreviewUrl(freshUrl)
                onUploadComplete?.(freshUrl)
            } catch (err) {
                const msg = err instanceof Error ? err.message : t('avatar.uploadError')
                setError(msg)
                // Revert preview on failure
                setPreviewUrl(null)
            } finally {
                setUploading(false)
                // Reset input so user can re-select the same file
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        },
        [userId, t, onUploadComplete]
    )

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="glass rounded-2xl p-6 flex items-center gap-4">
            {/* Avatar circle */}
            <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden relative">
                    {displayUrl ? (
                        <Image
                            src={displayUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized
                        />
                    ) : (
                        initials
                    )}

                    {/* Upload overlay */}
                    {uploading && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                    )}
                </div>

                {/* Camera button */}
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow-lg hover:brightness-110 transition-all disabled:opacity-50"
                    aria-label={t('avatar.change')}
                >
                    <Camera className="w-3.5 h-3.5" />
                </button>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-hidden="true"
                />
            </div>

            {/* User info */}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary truncate">
                    {userName || t('profile.noName')}
                </p>
                <p className="text-xs text-text-muted">
                    {t('profile.memberSince')}{' '}
                    {new Intl.DateTimeFormat(locale, {
                        month: 'long',
                        year: 'numeric',
                    }).format(new Date(memberSince))}
                </p>

                {/* Error message */}
                {error && (
                    <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs text-red-400 flex-1">{error}</p>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-300"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Upload hint */}
                {!error && !uploading && (
                    <p className="text-xs text-text-muted/60 mt-0.5">
                        {t('avatar.hint')}
                    </p>
                )}
            </div>
        </div>
    )
}
