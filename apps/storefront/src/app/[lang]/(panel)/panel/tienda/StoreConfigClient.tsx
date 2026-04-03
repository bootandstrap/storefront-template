'use client'

/**
 * Store Config Editor — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - PageEntrance animation
 * - Animated tab bar with layoutId indicator
 * - Animated tab content transitions (AnimatePresence)
 * - Focus ring transitions on inputs
 * - Animated save confirmation
 * - Animated announcement bar expand/collapse
 */

import { useState, useTransition } from 'react'
import { useI18n } from '@/lib/i18n/provider'
import { useToast } from '@/components/ui/Toaster'
import { Loader2, Check, Store, Palette, Search, Share2, CreditCard, Truck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StoreConfig } from '@/lib/config'
import { saveStoreConfig } from './actions'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'

interface StoreConfigClientProps {
    config: StoreConfig
}

type Tab = 'general' | 'apariencia' | 'seo' | 'social' | 'pagos' | 'entrega'

export default function StoreConfigClient({ config }: StoreConfigClientProps) {
    const { t } = useI18n()
    const [activeTab, setActiveTab] = useState<Tab>('general')
    const [formData, setFormData] = useState(config)
    const [isPending, startTransition] = useTransition()
    const toast = useToast()
    const [saved, setSaved] = useState(false)
    const [_saveError, setSaveError] = useState<string | null>(null)

    const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'general', label: t('panel.config.general'), icon: Store },
        { id: 'apariencia', label: t('panel.config.appearance'), icon: Palette },
        { id: 'seo', label: t('panel.config.seo'), icon: Search },
        { id: 'social', label: t('panel.config.social'), icon: Share2 },
        { id: 'pagos', label: t('panel.config.payments'), icon: CreditCard },
        { id: 'entrega', label: t('panel.config.delivery'), icon: Truck },
    ]

    const update = (key: keyof StoreConfig, value: unknown) => {
        setFormData((prev) => ({ ...prev, [key]: value }))
        setSaved(false)
        setSaveError(null)
    }

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveStoreConfig(formData)
            if (result.success) {
                setSaved(true)
                setSaveError(null)
                toast.success('✓')
            } else {
                setSaveError(result.error ?? 'Failed to save')
                toast.error(result.error ?? 'Failed to save')
            }
        })
    }

    const inputClass =
        'w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
    const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

    const tabContent: Record<Tab, React.ReactNode> = {
        general: (
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>{t('panel.config.businessName')}</label>
                    <input className={inputClass} value={formData.business_name ?? ''} onChange={(e) => update('business_name', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.storeEmail')}</label>
                    <input className={inputClass} type="email" value={formData.store_email ?? ''} onChange={(e) => update('store_email', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.storePhone')}</label>
                    <input className={inputClass} type="tel" value={formData.store_phone ?? ''} onChange={(e) => update('store_phone', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.whatsappNumber')}</label>
                    <input className={inputClass} value={formData.whatsapp_number ?? ''} onChange={(e) => update('whatsapp_number', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.storeAddress')}</label>
                    <textarea className={inputClass + ' resize-none'} rows={2} value={formData.store_address ?? ''} onChange={(e) => update('store_address', e.target.value)} />
                </div>
            </div>
        ),
        apariencia: (
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>{t('panel.config.heroTitle')}</label>
                    <input className={inputClass} value={formData.hero_title ?? ''} onChange={(e) => update('hero_title', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.heroSubtitle')}</label>
                    <input className={inputClass} value={formData.hero_subtitle ?? ''} onChange={(e) => update('hero_subtitle', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.footerDescription')}</label>
                    <textarea className={inputClass + ' resize-none'} rows={3} value={formData.footer_description ?? ''} onChange={(e) => update('footer_description', e.target.value)} />
                </div>
                <div className="flex items-center gap-3 pt-2">
                    <div
                        role="switch"
                        aria-checked={formData.announcement_bar_enabled ?? false}
                        tabIndex={0}
                        onClick={() => update('announcement_bar_enabled', !(formData.announcement_bar_enabled ?? false))}
                        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') update('announcement_bar_enabled', !(formData.announcement_bar_enabled ?? false)) }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2 ${
                            formData.announcement_bar_enabled ? 'bg-brand' : 'bg-sf-3'
                        }`}
                    >
                        <motion.span
                            layout
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ${
                                formData.announcement_bar_enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </div>
                    <label className="text-sm font-medium text-tx-sec cursor-pointer" onClick={() => update('announcement_bar_enabled', !(formData.announcement_bar_enabled ?? false))}>
                        {t('panel.config.announcementBarEnabled')}
                    </label>
                </div>
                <AnimatePresence>
                    {formData.announcement_bar_enabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div>
                                <label className={labelClass}>{t('panel.config.announcementBarText')}</label>
                                <input className={inputClass} value={formData.announcement_bar_text ?? ''} onChange={(e) => update('announcement_bar_text', e.target.value)} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        ),
        seo: (
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>{t('panel.config.metaTitle')}</label>
                    <p className="text-[11px] text-tx-faint mb-1.5">{t('panel.config.metaTitleDesc')}</p>
                    <input className={inputClass} value={formData.meta_title ?? ''} onChange={(e) => update('meta_title', e.target.value)} />
                    <p className={`text-[10px] mt-1 tabular-nums ${(formData.meta_title?.length ?? 0) > 60 ? 'text-rose-500 font-semibold' : 'text-tx-faint'}`}>
                        {formData.meta_title?.length ?? 0} / 60
                    </p>
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.metaDescription')}</label>
                    <p className="text-[11px] text-tx-faint mb-1.5">{t('panel.config.metaDescriptionDesc')}</p>
                    <textarea className={inputClass + ' resize-none'} rows={3} value={formData.meta_description ?? ''} onChange={(e) => update('meta_description', e.target.value)} />
                    <p className={`text-[10px] mt-1 tabular-nums ${(formData.meta_description?.length ?? 0) > 160 ? 'text-rose-500 font-semibold' : 'text-tx-faint'}`}>
                        {formData.meta_description?.length ?? 0} / 160
                    </p>
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.googleAnalyticsId')}</label>
                    <p className="text-[11px] text-tx-faint mb-1.5">{t('panel.config.googleAnalyticsIdDesc')}</p>
                    <input className={inputClass} value={formData.google_analytics_id ?? ''} onChange={(e) => update('google_analytics_id', e.target.value)} placeholder="G-XXXXXXXXXX" />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.facebookPixelId')}</label>
                    <p className="text-[11px] text-tx-faint mb-1.5">{t('panel.config.facebookPixelIdDesc')}</p>
                    <input className={inputClass} value={formData.facebook_pixel_id ?? ''} onChange={(e) => update('facebook_pixel_id', e.target.value)} />
                </div>
            </div>
        ),
        social: (
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>Facebook</label>
                    <input className={inputClass} value={formData.social_facebook ?? ''} onChange={(e) => update('social_facebook', e.target.value)} placeholder="https://facebook.com/..." />
                </div>
                <div>
                    <label className={labelClass}>Instagram</label>
                    <input className={inputClass} value={formData.social_instagram ?? ''} onChange={(e) => update('social_instagram', e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div>
                    <label className={labelClass}>TikTok</label>
                    <input className={inputClass} value={formData.social_tiktok ?? ''} onChange={(e) => update('social_tiktok', e.target.value)} placeholder="https://tiktok.com/@..." />
                </div>
                <div>
                    <label className={labelClass}>X / Twitter</label>
                    <input className={inputClass} value={formData.social_twitter ?? ''} onChange={(e) => update('social_twitter', e.target.value)} placeholder="https://x.com/..." />
                </div>
            </div>
        ),
        pagos: (
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>{t('panel.config.bankName')}</label>
                    <input className={inputClass} value={formData.bank_name ?? ''} onChange={(e) => update('bank_name', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.bankAccountType')}</label>
                    <input className={inputClass} value={formData.bank_account_type ?? ''} onChange={(e) => update('bank_account_type', e.target.value)} placeholder={t('panel.config.accountTypePlaceholder')} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.bankAccountNumber')}</label>
                    <input className={inputClass} value={formData.bank_account_number ?? ''} onChange={(e) => update('bank_account_number', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.bankAccountHolder')}</label>
                    <input className={inputClass} value={formData.bank_account_holder ?? ''} onChange={(e) => update('bank_account_holder', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.bankIdNumber')}</label>
                    <input className={inputClass} value={formData.bank_id_number ?? ''} onChange={(e) => update('bank_id_number', e.target.value)} />
                </div>
            </div>
        ),
        entrega: (
            <div className="space-y-5">
                <div>
                    <label className={labelClass}>{t('panel.config.minOrderAmount')}</label>
                    <input className={inputClass} type="number" value={formData.min_order_amount ?? 0} onChange={(e) => update('min_order_amount', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.maxDeliveryRadius')}</label>
                    <input className={inputClass} type="number" value={formData.max_delivery_radius_km ?? ''} onChange={(e) => update('max_delivery_radius_km', parseInt(e.target.value) || null)} placeholder="km" />
                </div>
                <div>
                    <label className={labelClass}>{t('panel.config.deliveryInfoText')}</label>
                    <textarea className={inputClass + ' resize-none'} rows={3} value={formData.delivery_info_text ?? ''} onChange={(e) => update('delivery_info_text', e.target.value)} />
                </div>
            </div>
        ),
    }

    return (
        <PageEntrance className="space-y-8">
            <SotaBentoGrid>
                <SotaBentoItem colSpan={12}>
                    <div className="space-y-4">

            {/* Animated Tab bar */}
            <div className="flex gap-1 bg-sf-0/50 backdrop-blur-md rounded-xl border border-sf-3/30 shadow-inner overflow-x-auto p-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-pressed={activeTab === tab.id}
                            className={`relative px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-1 ${
                                activeTab === tab.id
                                    ? 'text-brand'
                                    : 'text-tx-muted hover:text-tx'
                            }`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="config-tab-indicator"
                                    className="absolute inset-0 bg-white dark:bg-sf-2 rounded-lg shadow-sm"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Animated Form content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    <SotaGlassCard glowColor="none" className="p-6">
                    {tabContent[activeTab]}
                    </SotaGlassCard>
                </motion.div>
            </AnimatePresence>

            {/* Save button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3"
            >
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isPending ? t('common.saving') : t('common.saveChanges')}
                </button>
                <AnimatePresence>
                    {saved && (
                        <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className="text-sm text-emerald-600 font-medium flex items-center gap-1"
                        >
                            <Check className="w-4 h-4" /> {t('common.saved')}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>

                    </div>
                </SotaBentoItem>
            </SotaBentoGrid>
        </PageEntrance>
    )
}
