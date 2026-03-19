'use client'

/**
 * WelcomeModal — First-login welcome screen for Owner Panel
 *
 * Shows what's been pre-configured during provisioning,
 * highlights items that need attention, and offers either
 * a guided panel tour or skip to dashboard.
 *
 * Includes an animated SOTA thank-you with BootandStrap branding.
 */

import { useState, useEffect, useRef } from 'react'
import {
    Globe, DollarSign, Languages, Puzzle,
    ImageIcon, Phone,
    ChevronRight, Sparkles, X,
} from 'lucide-react'
import Image from 'next/image'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReadinessItem {
    label: string
    done: boolean
    icon: typeof Globe
}

interface WelcomeModalProps {
    storeName: string
    domain: string | null
    currency: string
    language: string
    moduleCount: number
    hasLogo: boolean
    hasContact: boolean
    onStartTour: () => void
    onSkip: () => void
    t: (key: string) => string
}

// ---------------------------------------------------------------------------
// Confetti Particle
// ---------------------------------------------------------------------------

function hashToPercent(seed: string): number {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return (hash % 10000) / 100
}

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
    const leftPercent = hashToPercent(`${color}:${delay}`)

    return (
        <div
            className="absolute w-2 h-2 rounded-full opacity-0 animate-confetti"
            style={{
                backgroundColor: color,
                left: `${leftPercent}%`,
                animationDelay: `${delay}ms`,
            }}
        />
    )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WelcomeModal({
    storeName,
    domain,
    currency,
    language,
    moduleCount,
    hasLogo,
    hasContact,
    onStartTour,
    onSkip,
    t,
}: WelcomeModalProps) {
    const [phase, setPhase] = useState<'branding' | 'readiness'>('branding')
    const [visible, setVisible] = useState(false)
    const [typedName, setTypedName] = useState('')
    const typewriterRef = useRef<NodeJS.Timeout | null>(null)

    // Entrance animation
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 50)
        return () => clearTimeout(timer)
    }, [])

    // Typewriter effect for store name during branding phase
    useEffect(() => {
        if (phase === 'branding' && storeName) {
            let i = 0
            setTypedName('')
            const tick = () => {
                if (i < storeName.length) {
                    setTypedName(storeName.slice(0, i + 1))
                    i++
                    typewriterRef.current = setTimeout(tick, 80)
                }
            }
            typewriterRef.current = setTimeout(tick, 600)
            return () => { if (typewriterRef.current) clearTimeout(typewriterRef.current) }
        }
    }, [phase, storeName])

    // Auto-transition from branding splash to readiness after 3.5s
    useEffect(() => {
        if (phase === 'branding') {
            const timer = setTimeout(() => setPhase('readiness'), 3500)
            return () => clearTimeout(timer)
        }
    }, [phase])

    const confettiColors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4']

    const readinessItems: ReadinessItem[] = [
        {
            label: domain
                ? `${t('welcome.ready.domain')} — ${domain}`
                : (t('welcome.ready.domainGeneric') || 'Store created'),
            done: true,
            icon: Globe,
        },
        {
            label: `${t('welcome.ready.currency')} ${currency}`,
            done: true,
            icon: DollarSign,
        },
        {
            label: `${t('welcome.ready.language')} ${language.toUpperCase()}`,
            done: true,
            icon: Languages,
        },
        ...(moduleCount > 0 ? [{
            label: `${moduleCount} ${t('welcome.ready.modules')}`,
            done: true as const,
            icon: Puzzle as typeof Globe,
        }] : []),
        {
            label: hasLogo
                ? (t('welcome.ready.logo') || 'Logo set')
                : (t('welcome.pending.logo') || 'Logo not set'),
            done: hasLogo,
            icon: ImageIcon,
        },
        {
            label: hasContact
                ? (t('welcome.ready.contact') || 'Contact info added')
                : (t('welcome.pending.contact') || 'Contact info incomplete'),
            done: hasContact,
            icon: Phone,
        },
    ]

    const doneCount = readinessItems.filter(i => i.done).length

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`relative w-full max-w-lg bg-surface-1 rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* ── Phase: Animated Branding Splash ── */}
                {phase === 'branding' && (
                    <div className="relative flex flex-col items-center justify-center px-8 py-16 min-h-[380px] overflow-hidden">
                        {/* Confetti */}
                        <div className="absolute inset-0 pointer-events-none">
                            {confettiColors.map((color, i) =>
                                Array.from({ length: 4 }).map((_, j) => (
                                    <ConfettiParticle
                                        key={`${i}-${j}`}
                                        delay={i * 200 + j * 150}
                                        color={color}
                                    />
                                ))
                            )}
                        </div>

                        {/* Radial glow */}
                        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />

                        {/* BootandStrap logo */}
                        <div className="relative mb-6 animate-bounce-slow">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                                <Image
                                    src="/bootandstrap-logo.png"
                                    alt="BootandStrap"
                                    width={56}
                                    height={56}
                                    className="rounded-lg"
                                />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        </div>

                        {/* Thank you message */}
                        <h1 className="text-2xl md:text-3xl font-bold font-display text-text-primary text-center mb-1 animate-fade-in-up">
                            {t('welcome.thankYou') || '¡Gracias por confiar en nosotros!'}
                        </h1>
                        {/* Typewriter store name */}
                        <p className="text-lg font-bold text-primary text-center mb-3 h-7">
                            {typedName}
                            <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse align-middle" />
                        </p>
                        <p className="text-text-muted text-center text-sm max-w-sm animate-fade-in-up-delay">
                            {t('welcome.poweredBy') || 'Tu tienda está potenciada por BootandStrap'}
                        </p>

                        {/* Animated progress dots */}
                        <div className="flex gap-2 mt-8">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-primary animate-pulse"
                                    style={{ animationDelay: `${i * 300}ms` }}
                                />
                            ))}
                        </div>

                        {/* Skip splash button */}
                        <button
                            type="button"
                            onClick={() => setPhase('readiness')}
                            className="absolute top-4 right-4 text-text-muted/40 hover:text-text-muted transition-colors"
                            aria-label="Skip"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* ── Phase: Readiness Screen ── */}
                {phase === 'readiness' && (
                    <div className="animate-fade-in">
                        {/* Header */}
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold font-display text-text-primary">
                                        {t('welcome.title') || `Welcome, ${storeName}!`}
                                    </h2>
                                    <p className="text-xs text-text-muted">
                                        {t('welcome.subtitle') || "Your store is ready. Here's what's been set up:"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Readiness checklist */}
                        <div className="px-8 pb-4 space-y-1.5">
                            {readinessItems.map((item, idx) => {
                                const Icon = item.icon
                                return (
                                    <div
                                        key={item.label}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all opacity-0 animate-fade-in-up ${item.done
                                            ? 'bg-green-500/5 text-text-secondary'
                                            : 'bg-amber-500/5 text-amber-600'
                                            }`}
                                        style={{ animationDelay: `${idx * 120}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.done
                                            ? 'bg-green-500/15 text-green-500 animate-pulse-glow'
                                            : 'bg-amber-500/15 text-amber-500'
                                            }`}>
                                            {item.done ? (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <Icon className="w-3 h-3" />
                                            )}
                                        </div>
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Progress summary */}
                        <div className="mx-8 h-1.5 bg-surface-3 rounded-full overflow-hidden mb-6">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-700"
                                style={{ width: `${(doneCount / readinessItems.length) * 100}%` }}
                            />
                        </div>

                        {/* Actions */}
                        <div className="px-8 pb-8 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onStartTour}
                                className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl"
                            >
                                🎓 {t('welcome.startTour') || 'Take a Quick Tour'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={onSkip}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-text-muted hover:text-text-primary rounded-xl border border-surface-3 hover:bg-surface-2 transition-all"
                            >
                                {t('welcome.skip') || 'Skip to Dashboard'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
