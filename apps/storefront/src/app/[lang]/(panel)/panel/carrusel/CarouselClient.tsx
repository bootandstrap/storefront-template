'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/provider'
import { createSlide, updateSlide, deleteSlide } from './actions'

interface CarouselSlide {
    id: string
    title: string | null
    subtitle: string | null
    image: string | null
    image_url?: string | null
    type: string
    cta_text: string | null
    cta_url: string | null
    active: boolean
    sort_order: number
}

interface Props {
    slides: CarouselSlide[]
    canAdd: boolean
    slideCount: number
    maxSlides: number
}

export default function CarouselClient({ slides, canAdd, slideCount, maxSlides }: Props) {
    const { t } = useI18n()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [subtitle, setSubtitle] = useState('')
    const [ctaText, setCtaText] = useState('')
    const [ctaUrl, setCtaUrl] = useState('')
    const [type, setType] = useState<'image' | 'product' | 'offer'>('image')

    const resetForm = () => {
        setTitle('')
        setSubtitle('')
        setCtaText('')
        setCtaUrl('')
        setType('image')
        setEditingId(null)
        setShowForm(false)
        setError(null)
    }

    const openEdit = (slide: CarouselSlide) => {
        setTitle(slide.title ?? '')
        setSubtitle(slide.subtitle ?? '')
        setCtaText(slide.cta_text ?? '')
        setCtaUrl(slide.cta_url ?? '')
        setType((slide.type as 'image' | 'product' | 'offer') ?? 'image')
        setEditingId(slide.id)
        setShowForm(true)
    }

    const handleSubmit = () => {
        startTransition(async () => {
            const data = { title, subtitle, cta_text: ctaText, cta_url: ctaUrl, type }
            const result = editingId
                ? await updateSlide(editingId, data)
                : await createSlide(data)

            if (result.success) {
                resetForm()
                router.refresh()
            } else {
                setError(result.error ?? 'Error')
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm(t('common.confirmDelete'))) return
        startTransition(async () => {
            const result = await deleteSlide(id)
            if (result.success) router.refresh()
            else setError(result.error ?? 'Error')
        })
    }

    const handleToggleActive = (slide: CarouselSlide) => {
        startTransition(async () => {
            const result = await updateSlide(slide.id, { active: !slide.active })
            if (result.success) router.refresh()
        })
    }

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('panel.carousel.title')}
                    </h1>
                    <p className="text-text-muted mt-1">{t('panel.carousel.subtitle')}</p>
                </div>
                <button
                    className="btn btn-primary"
                    disabled={!canAdd || isPending}
                    onClick={() => { resetForm(); setShowForm(true) }}
                >
                    + {t('panel.carousel.addSlide')}
                </button>
            </div>

            <p className="text-xs text-text-muted">
                {slideCount} / {maxSlides} {t('panel.carousel.slides')}
                {!canAdd && <span className="text-red-500 ml-2">— {t('limits.maxReached')}</span>}
            </p>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* Create/Edit form */}
            {showForm && (
                <div className="glass rounded-2xl p-6 space-y-4">
                    <h2 className="font-bold text-lg text-text-primary">
                        {editingId ? t('common.edit') : t('panel.carousel.addSlide')}
                    </h2>
                    <div>
                        <label className={labelClass}>{t('common.type')}</label>
                        <select value={type} onChange={e => setType(e.target.value as 'image' | 'product' | 'offer')} className={inputClass}>
                            <option value="image">Image</option>
                            <option value="product">Product</option>
                            <option value="offer">Offer</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t('common.title')}</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>{t('common.subtitle')}</label>
                        <input value={subtitle} onChange={e => setSubtitle(e.target.value)} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>CTA Text</label>
                            <input value={ctaText} onChange={e => setCtaText(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>CTA URL</label>
                            <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary">
                            {isPending ? '...' : editingId ? t('common.save') : t('common.create')}
                        </button>
                        <button onClick={resetForm} className="btn btn-ghost">{t('common.cancel')}</button>
                    </div>
                </div>
            )}

            {/* Slides grid */}
            {slides.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-4xl mb-3">🎠</div>
                    <p className="text-text-muted">{t('panel.carousel.empty')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slides.map((slide) => (
                        <div key={slide.id} className="glass rounded-2xl overflow-hidden">
                            {(slide.image || slide.image_url) && (
                                <div className="aspect-video bg-surface-1 relative">
                                    <Image
                                        src={(slide.image || slide.image_url) as string}
                                        alt={slide.title ?? ''}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                    {!slide.active && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {t('common.inactive')}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-4">
                                <h3 className="font-bold text-text-primary">
                                    {slide.title || t('panel.carousel.untitled')}
                                </h3>
                                {slide.subtitle && (
                                    <p className="text-sm text-text-muted mt-1">{slide.subtitle}</p>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => handleToggleActive(slide)} className="btn btn-ghost text-xs" disabled={isPending}>
                                        {slide.active ? '🔴 ' + t('common.deactivate') : '🟢 ' + t('common.activate')}
                                    </button>
                                    <button onClick={() => openEdit(slide)} className="btn btn-ghost text-xs" disabled={isPending}>
                                        {t('common.edit')}
                                    </button>
                                    <button onClick={() => handleDelete(slide.id)} className="btn btn-ghost text-xs text-red-500" disabled={isPending}>
                                        {t('common.delete')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
