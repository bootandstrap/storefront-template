'use client'

/**
 * Store Config Editor — Owner Panel
 *
 * Tabbed form: General, Apariencia, SEO, Social, Pagos, Entrega
 * Server actions for save + revalidateConfig()
 */

import { useState, useTransition } from 'react'
import { useI18n } from '@/lib/i18n/provider'
import { useToast } from '@/components/ui/Toaster'
import type { StoreConfig } from '@/lib/config'
import { saveStoreConfig } from './actions'

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

    const tabs: { id: Tab; label: string }[] = [
        { id: 'general', label: t('panel.config.general') },
        { id: 'apariencia', label: t('panel.config.appearance') },
        { id: 'seo', label: t('panel.config.seo') },
        { id: 'social', label: t('panel.config.social') },
        { id: 'pagos', label: t('panel.config.payments') },
        { id: 'entrega', label: t('panel.config.delivery') },
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
        'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    return (
        <div className="space-y-6">
            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-primary text-white'
                            : 'text-text-muted hover:bg-surface-1 hover:text-text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form content */}
            <div className="glass rounded-2xl p-6 space-y-5">
                {activeTab === 'general' && (
                    <>
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
                            <textarea className={inputClass} rows={2} value={formData.store_address ?? ''} onChange={(e) => update('store_address', e.target.value)} />
                        </div>
                    </>
                )}

                {activeTab === 'apariencia' && (
                    <>
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
                            <textarea className={inputClass} rows={3} value={formData.footer_description ?? ''} onChange={(e) => update('footer_description', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="announcement_bar_enabled"
                                checked={formData.announcement_bar_enabled ?? false}
                                onChange={(e) => update('announcement_bar_enabled', e.target.checked)}
                                className="w-4 h-4 rounded border-surface-3"
                            />
                            <label htmlFor="announcement_bar_enabled" className="text-sm font-medium text-text-secondary">
                                {t('panel.config.announcementBarEnabled')}
                            </label>
                        </div>
                        {formData.announcement_bar_enabled && (
                            <div>
                                <label className={labelClass}>{t('panel.config.announcementBarText')}</label>
                                <input className={inputClass} value={formData.announcement_bar_text ?? ''} onChange={(e) => update('announcement_bar_text', e.target.value)} />
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'seo' && (
                    <>
                        <div>
                            <label className={labelClass}>{t('panel.config.metaTitle')}</label>
                            <input className={inputClass} value={formData.meta_title ?? ''} onChange={(e) => update('meta_title', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('panel.config.metaDescription')}</label>
                            <textarea className={inputClass} rows={3} value={formData.meta_description ?? ''} onChange={(e) => update('meta_description', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('panel.config.googleAnalyticsId')}</label>
                            <input className={inputClass} value={formData.google_analytics_id ?? ''} onChange={(e) => update('google_analytics_id', e.target.value)} placeholder="G-XXXXXXXXXX" />
                        </div>
                        <div>
                            <label className={labelClass}>{t('panel.config.facebookPixelId')}</label>
                            <input className={inputClass} value={formData.facebook_pixel_id ?? ''} onChange={(e) => update('facebook_pixel_id', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>Sentry DSN</label>
                            <input className={inputClass} value={formData.sentry_dsn ?? ''} onChange={(e) => update('sentry_dsn', e.target.value)} placeholder="https://xxx@xxx.ingest.sentry.io/xxx" />
                        </div>
                    </>
                )}

                {activeTab === 'social' && (
                    <>
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
                    </>
                )}

                {activeTab === 'pagos' && (
                    <>
                        <div>
                            <label className={labelClass}>{t('panel.config.bankName')}</label>
                            <input className={inputClass} value={formData.bank_name ?? ''} onChange={(e) => update('bank_name', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('panel.config.bankAccountType')}</label>
                            <input className={inputClass} value={formData.bank_account_type ?? ''} onChange={(e) => update('bank_account_type', e.target.value)} placeholder="Ahorros / Corriente" />
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
                    </>
                )}

                {activeTab === 'entrega' && (
                    <>
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
                            <textarea className={inputClass} rows={3} value={formData.delivery_info_text ?? ''} onChange={(e) => update('delivery_info_text', e.target.value)} />
                        </div>
                    </>
                )}
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="btn btn-primary"
                >
                    {isPending ? t('common.saving') : t('common.saveChanges')}
                </button>
                {saved && (
                    <span className="text-sm text-green-600 font-medium">
                        ✓ {t('common.saved')}
                    </span>
                )}
            </div>
        </div>
    )
}
