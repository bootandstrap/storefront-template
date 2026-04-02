'use client'

/**
 * Carousel Manager — Owner Panel (SOTA rewrite)
 *
 * Fixes:
 * - confirm() → PanelConfirmDialog
 * - emoji toggles (🔴/🟢) → lucide icons + animated switch
 * - No animation → PageEntrance + ListStagger + StaggerItem
 * - Instant form → AnimatePresence slide-down
 * - No empty state animation
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/provider'
import { createSlide, updateSlide, deleteSlide } from './actions'
import { Images, Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

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
    const toast = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const confirmDialog = useConfirmDialog({
        title: t('common.confirmDelete'),
        description: t('panel.carousel.deleteConfirm') || '¿Eliminar esta diapositiva?',
        confirmLabel: t('common.delete'),
        variant: 'danger',
    })

    // Form state
    const [title, setTitle] = useState('')
    const [subtitle, setSubtitle] = useState('')
    const [ctaText, setCtaText] = useState('')
    const [ctaUrl, setCtaUrl] = useState('')
    const [type, setType] = useState<'image' | 'product' | 'offer'>('image')

    const resetForm = () => {
        setTitle(''); setSubtitle(''); setCtaText(''); setCtaUrl('')
        setType('image'); setEditingId(null); setShowForm(false); setError(null)
    }

    const openEdit = (slide: CarouselSlide) => {
        setTitle(slide.title ?? ''); setSubtitle(slide.subtitle ?? '')
        setCtaText(slide.cta_text ?? ''); setCtaUrl(slide.cta_url ?? '')
        setType((slide.type as 'image' | 'product' | 'offer') ?? 'image')
        setEditingId(slide.id); setShowForm(true)
    }

    const handleSubmit = () => {
        startTransition(async () => {
            const data = { title, subtitle, cta_text: ctaText, cta_url: ctaUrl, type }
            const result = editingId
                ? await updateSlide(editingId, data)
                : await createSlide(data)
            if (result.success) { resetForm(); router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const handleDelete = (id: string) => {
        confirmDialog.confirm(() => {
            startTransition(async () => {
                const result = await deleteSlide(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    const handleToggleActive = (slide: CarouselSlide) => {
        startTransition(async () => {
            const result = await updateSlide(slide.id, { active: !slide.active })
            if (result.success) router.refresh()
        })
    }

    const [gateData, setGateData] = useState<{isOpen: boolean, flag: string}>({ isOpen: false, flag: '' })
    const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
    const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

    return (
        <PageEntrance className="space-y-5">
            <PanelPageHeader
                title={t('panel.carousel.title')}
                subtitle={t('panel.carousel.subtitle')}
                icon={<Images className="w-5 h-5" />}
                action={
                    <button
                        className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                        disabled={isPending}
                        onClick={() => {
                            if (!canAdd) {
                                setGateData({ isOpen: true, flag: 'carousel_slides_limit' })
                            } else {
                                resetForm(); setShowForm(true)
                            }
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        {t('panel.carousel.addSlide')}
                    </button>
                }
            />

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-tx-muted">
                {slideCount} / {maxSlides} {t('panel.carousel.slides')}
                {!canAdd && <span className="text-red-500 ml-2">— {t('limits.maxReached')}</span>}
            </motion.p>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <ClientFeatureGate 
                isOpen={gateData.isOpen} 
                onClose={() => setGateData({ ...gateData, isOpen: false })} 
                flag={gateData.flag} 
            />

            {/* ── Form ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="glass rounded-2xl p-6 space-y-4"
                    >
                        <h2 className="font-bold text-lg text-tx">
                            {editingId ? t('common.edit') : t('panel.carousel.addSlide')}
                        </h2>
                        <div>
                            <label className={labelClass}>{t('common.type')}</label>
                            <select value={type} onChange={e => setType(e.target.value as 'image' | 'product' | 'offer')} className={inputClass}>
                                <option value="image">{t('panel.carousel.typeImage')}</option>
                                <option value="product">{t('panel.carousel.typeProduct')}</option>
                                <option value="offer">{t('panel.carousel.typeOffer')}</option>
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
                                <label className={labelClass}>{t('panel.carousel.ctaText')}</label>
                                <input value={ctaText} onChange={e => setCtaText(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>{t('panel.carousel.ctaUrl')}</label>
                                <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isPending ? '...' : editingId ? t('common.save') : t('common.create')}
                            </button>
                            <button onClick={resetForm} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{t('common.cancel')}</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Slides grid ── */}
            {slides.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Images className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-tx-muted text-lg">{t('panel.carousel.empty')}</p>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slides.map((slide) => (
                        <StaggerItem key={slide.id}>
                            <motion.div
                                whileHover={{ y: -2 }}
                                className="glass rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
                            >
                                {(slide.image || slide.image_url) && (
                                    <div className="aspect-video bg-sf-1 relative">
                                        <Image
                                            src={(slide.image || slide.image_url) as string}
                                            alt={slide.title ?? ''}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                        {!slide.active && (
                                            <div className="absolute top-2 right-2 bg-red-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                                {t('common.inactive')}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="font-bold text-tx">
                                        {slide.title || t('panel.carousel.untitled')}
                                    </h3>
                                    {slide.subtitle && (
                                        <p className="text-sm text-tx-muted mt-1">{slide.subtitle}</p>
                                    )}
                                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-sf-2">
                                        <button
                                            onClick={() => handleToggleActive(slide)}
                                            aria-pressed={slide.active}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                                slide.active
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                    : 'bg-sf-1 text-tx-muted hover:bg-sf-2'
                                            }`}
                                            disabled={isPending}
                                        >
                                            {slide.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            {slide.active ? t('common.active') : t('common.inactive')}
                                        </button>
                                        <button
                                            onClick={() => openEdit(slide)}
                                            aria-label={t('common.edit')}
                                            className="p-2 min-h-[36px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            disabled={isPending}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(slide.id)}
                                            aria-label={t('common.delete')}
                                            className="p-2 min-h-[36px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                            disabled={isPending}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}

            <PanelConfirmDialog {...confirmDialog.dialogProps} />
        </PageEntrance>
    )
}
