'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getModuleActivationUrl, FEATURE_GATE_MAP } from '@/lib/feature-gate-config'
import { useI18n } from '@/lib/i18n/provider'
import { Sparkles, ArrowRight, Zap, Shield, X, Info } from 'lucide-react'
import Link from 'next/link'

interface ClientFeatureGateProps {
    isOpen: boolean
    onClose: () => void
    /** The flag (e.g. enable_pos) or limit (e.g. max_products_limit) that triggered this upsell */
    flag: string
}

const MODULE_BENEFITS: Record<string, { icon: React.ReactNode; key: string }[]> = {
    ecommerce: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.products' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.orders' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.payments' },
    ],
    seo: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.analytics' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.seo' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.reports' },
    ],
    chatbot: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.aiChat' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.support247' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.leadCapture' },
    ],
    crm: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.contacts' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.segments' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.export' },
    ],
    sales_channels: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.whatsapp' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.multichannel' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.quickCheckout' },
    ],
    i18n: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.languages' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.currencies' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.global' },
    ],
    auth_advanced: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.socialLogin' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.twoFactor' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.sso' },
    ],
    email_marketing: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.campaigns' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.automation' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.templates' },
    ],
    pos: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.posQuickSale' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.posMultiDevice' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.posOffline' },
    ],
    capacidad: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.trafficExpansion' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.trafficAnalytics' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.trafficAutoscale' },
    ],
    rrss: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.socialLinks' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.socialProof' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.socialSharing' },
    ],
    automation: [
        { icon: <Zap className="w-4 h-4" />, key: 'featureGate.benefits.adminApi' },
        { icon: <Shield className="w-4 h-4" />, key: 'featureGate.benefits.webhooks' },
        { icon: <Sparkles className="w-4 h-4" />, key: 'featureGate.benefits.integrations' },
    ],
}

export default function ClientFeatureGate({ isOpen, onClose, flag }: ClientFeatureGateProps) {
    const { t, locale } = useI18n()

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    // Determine if it's a limit or a boolean flag
    // By convention, governance-contract has flags (enable_pos) and limits (max_products_limit)
    // Limits don't perfectly map to FEATURE_GATE_MAP. So we provide fallbacks depending on prefix.
    const isLimit = flag.includes('_limit')
    const mappedFlag = isLimit ? getFlagForLimit(flag) : flag

    const entry = FEATURE_GATE_MAP[mappedFlag]
    const icon = entry?.icon ?? (isLimit ? '📈' : '🔒')
    
    // The dictionary handles translation for module names, fallback to raw flag if missing
    const moduleName = entry ? t(entry.moduleNameKey) : flag.replace(/_/g, ' ')
    const activationUrl = getModuleActivationUrl(mappedFlag, locale)
    const moduleKey = entry?.moduleKey ?? ''
    const benefits = MODULE_BENEFITS[moduleKey] ?? []

    const description = isLimit 
        ? t('limits.maxReachedDescription') || 'Has alcanzado el límite actual de tu plan. Aumenta tu capacidad subiendo de nivel.'
        : (t('featureGate.description') || '').replace('{module}', moduleName)

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sf-0/80 backdrop-blur-md"
            >
                <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-4xl rounded-3xl overflow-hidden bg-sf-0 border border-sf-3 shadow-2xl flex flex-col max-h-[90vh]"
                >
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-sf-1/50 text-tx-muted hover:text-tx hover:bg-sf-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto hidden-scroll">
                        {/* Left Side: Content */}
                        <div className="p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-sf-2 relative overflow-hidden">
                            {/* Glow accent */}
                            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-brand/10 blur-3xl" />
                            
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sf-1 border border-sf-2 text-xs font-semibold uppercase tracking-widest text-tx-muted mb-6">
                                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                                    <span>{isLimit ? (t('limits.upgradeRequired') || 'Ampliación de Plan') : (t('featureGate.premiumModule') || 'Módulo Premium')}</span>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-display font-bold text-tx tracking-tight mb-4">
                                    {moduleName}
                                </h2>

                                <p className="text-base text-tx-sec leading-relaxed font-light mb-8 max-w-sm">
                                    {description}
                                </p>

                                <div className="flex flex-col gap-3">
                                    <Link
                                        href={activationUrl}
                                        className="group/btn relative overflow-hidden rounded-xl bg-text-brand text-sf-0 px-6 py-3.5 text-sm font-semibold transition-all duration-300 hover:bg-brand inline-flex justify-center items-center gap-2 hover:shadow-lg hover:shadow-brand-soft"
                                    >
                                        <span className="relative z-10">
                                            {isLimit ? (t('limits.upgradeNow') || 'Mejorar Capacidad') : (t('featureGate.activateNow') || 'Activar Ahora')}
                                        </span>
                                        <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                    </Link>
                                    
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-3 rounded-xl border border-sf-3 text-tx-sec text-sm font-medium hover:bg-sf-1 transition-colors"
                                    >
                                        {t('common.cancel') || 'Cancelar'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Benefits */}
                        <div className="p-8 md:p-12 bg-sf-1 relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute bottom-0 right-0 w-full h-[50%] bg-gradient-to-t from-brand/5 to-transparent pointer-events-none" />
                            
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-sf-0 border border-sf-2 shadow-sm flex items-center justify-center text-2xl mb-8">
                                    {icon}
                                </div>

                                {benefits.length > 0 && (
                                    <div className="space-y-5">
                                        <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-widest">
                                            {t('featureGate.whatYouGet') || 'Beneficios incluidos'}
                                        </h3>
                                        <ul className="space-y-4">
                                            {benefits.map((benefit, i) => (
                                                <li key={i} className="flex items-start gap-3 group">
                                                    <div className="w-8 h-8 rounded-full bg-sf-0 border border-sf-2 flex items-center justify-center flex-shrink-0 text-tx-sec group-hover:text-brand transition-colors">
                                                        {benefit.icon}
                                                    </div>
                                                    <div className="pt-1.5 font-medium text-tx text-sm group-hover:text-brand transition-colors">
                                                        {t(benefit.key) || benefit.key}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {isLimit && benefits.length === 0 && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-sf-0 border border-sf-2 shadow-sm">
                                        <Zap className="w-5 h-5 text-brand" />
                                        <p className="text-sm text-tx-sec">
                                            Sube de nivel para aumentar tus límites y seguir escalando tu negocio.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// Map limit keys to their respective module capability to show the correct icon/description
function getFlagForLimit(limitFlag: string): string {
    if (limitFlag.includes('products') || limitFlag.includes('categories')) return 'ecommerce_pro' // or 'ecommerce'
    if (limitFlag.includes('pages')) return 'ecommerce_pro'
    if (limitFlag.includes('carousel')) return 'ecommerce_pro'
    return 'capacidad' // generic fallback
}
