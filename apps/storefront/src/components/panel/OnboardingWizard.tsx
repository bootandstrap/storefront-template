'use client'

/**
 * OnboardingWizard — First-login setup for new Owner Panel users
 *
 * Guides business owners through initial store setup:
 *   1. Welcome — Business name confirmation
 *   2. Contact — WhatsApp, email, phone
 *   3. Payments — Select payment methods
 *   4. First Product — Quick product creation
 *   5. Done — Preview + public store link
 *
 * State persisted to Supabase `config.onboarding_completed`.
 * Only shows when `onboarding_completed` is false/null.
 */

import { useState, useCallback } from 'react'
import {
    Store, Phone, CreditCard, Package, CheckCircle,
    ChevronRight, ChevronLeft, Sparkles, Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingData {
    businessName: string
    whatsapp: string
    email: string
    paymentMethods: string[]
}

interface OnboardingWizardProps {
    storeName: string
    storeUrl: string
    locale: string
    onComplete: (data: OnboardingData) => Promise<void>
    t: (key: string) => string
}

interface StepDef {
    id: string
    title: string
    icon: typeof Store
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingWizard({
    storeName,
    storeUrl,
    locale,
    onComplete,
    t,
}: OnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [completing, setCompleting] = useState(false)

    // Form state
    const [businessName, setBusinessName] = useState(storeName)
    const [whatsapp, setWhatsapp] = useState('')
    const [email, setEmail] = useState('')
    const [paymentMethods, setPaymentMethods] = useState<string[]>(['whatsapp'])

    const steps: StepDef[] = [
        { id: 'welcome', title: t('onboarding.steps.welcome') || 'Welcome', icon: Sparkles },
        { id: 'contact', title: t('onboarding.steps.contact') || 'Contact Info', icon: Phone },
        { id: 'payments', title: t('onboarding.steps.payments') || 'Payment Methods', icon: CreditCard },
        { id: 'product', title: t('onboarding.steps.product') || 'First Product', icon: Package },
        { id: 'done', title: t('onboarding.steps.done') || 'All Set!', icon: CheckCircle },
    ]

    const goNext = useCallback(() => setCurrentStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length])
    const goBack = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), [])

    const handleComplete = useCallback(async () => {
        setCompleting(true)
        try {
            await onComplete({ businessName, whatsapp, email, paymentMethods })
        } finally {
            setCompleting(false)
        }
    }, [onComplete, businessName, whatsapp, email, paymentMethods])

    const togglePayment = (method: string) => {
        setPaymentMethods((prev) =>
            prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
        )
    }

    const step = steps[currentStep]
    const StepIcon = step.icon
    const isLast = currentStep === steps.length - 1

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-surface-1 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Progress bar */}
                <div className="h-1 bg-surface-3">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                    {steps.map((s, i) => (
                        <div
                            key={s.id}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentStep
                                ? 'bg-primary w-6'
                                : i < currentStep
                                    ? 'bg-primary/50'
                                    : 'bg-surface-3'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 min-h-[320px] flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <StepIcon className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">{step.title}</h2>
                    </div>

                    <div className="flex-1">
                        {/* Step 0: Welcome */}
                        {currentStep === 0 && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-text-secondary">
                                    {t('onboarding.welcome.description') ||
                                        `Welcome to your new store! Let's set up the basics in just a few steps.`}
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        {t('onboarding.welcome.storeNameLabel') || 'Store Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-white/5 text-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                        placeholder="My Amazing Store"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 1: Contact */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-text-muted mb-2">
                                    {t('onboarding.contact.description') ||
                                        'How should customers reach you?'}
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        WhatsApp
                                    </label>
                                    <input
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-white/5 text-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                        placeholder="+41 79 123 45 67"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-white/5 text-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                        placeholder="info@mystore.com"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Payment Methods */}
                        {currentStep === 2 && (
                            <div className="space-y-3 animate-fade-in">
                                <p className="text-sm text-text-muted mb-2">
                                    {t('onboarding.payments.description') ||
                                        'Which payment methods do you want to offer?'}
                                </p>
                                {[
                                    { id: 'whatsapp', label: 'WhatsApp Order', emoji: '💬' },
                                    { id: 'card', label: 'Credit / Debit Card (Stripe)', emoji: '💳' },
                                    { id: 'cod', label: 'Cash on Delivery', emoji: '💵' },
                                    { id: 'bank', label: 'Bank Transfer', emoji: '🏦' },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => togglePayment(method.id)}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${paymentMethods.includes(method.id)
                                            ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                            : 'border-surface-3 bg-white/3 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="text-xl">{method.emoji}</span>
                                        <span className="text-sm font-medium text-text-primary">{method.label}</span>
                                        {paymentMethods.includes(method.id) && (
                                            <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 3: First Product */}
                        {currentStep === 3 && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-text-muted">
                                    {t('onboarding.product.description') ||
                                        `You can add your first product now or skip and do it later from the Catalog section.`}
                                </p>
                                <div className="p-6 rounded-xl border border-dashed border-surface-3 text-center">
                                    <Package className="w-8 h-8 text-text-muted mx-auto mb-2" />
                                    <p className="text-sm text-text-muted mb-3">
                                        {t('onboarding.product.hint') ||
                                            'Head to Catalog → Products after finishing setup'}
                                    </p>
                                    <a
                                        href={`/${locale}/panel/catalogo`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    >
                                        {t('onboarding.product.openCatalog') || 'Open Catalog'}
                                        <ChevronRight className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Done */}
                        {currentStep === 4 && (
                            <div className="space-y-4 animate-fade-in text-center">
                                <div className="text-5xl mb-2">🎉</div>
                                <p className="text-text-secondary">
                                    {t('onboarding.done.description') ||
                                        `Your store "${businessName}" is ready! You can now manage products, orders, and settings from this panel.`}
                                </p>
                                <a
                                    href={storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                                >
                                    <Store className="w-4 h-4" />
                                    {t('onboarding.done.viewStore') || 'View your store'}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-3">
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={currentStep === 0}
                            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {t('onboarding.back') || 'Back'}
                        </button>

                        {isLast ? (
                            <button
                                type="button"
                                onClick={handleComplete}
                                disabled={completing}
                                className="btn btn-primary inline-flex items-center gap-2 px-6 py-2.5"
                            >
                                {completing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                {t('onboarding.finish') || 'Start Selling'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={goNext}
                                className="btn btn-primary inline-flex items-center gap-2 px-6 py-2.5"
                            >
                                {t('onboarding.next') || 'Continue'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
