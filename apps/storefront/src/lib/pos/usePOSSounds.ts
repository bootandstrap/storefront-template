/**
 * POS Sound Effects — Web Audio API
 *
 * Zero-dependency sound system. Respects prefers-reduced-motion.
 * All sounds are synthesized — no audio files needed.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    // Respect reduced motion preference
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null
    try {
        return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
        return null
    }
}

export interface POSSoundsControllerOptions {
    createAudioContext?: (() => AudioContext) | null
    prefersReducedMotion?: () => boolean
}

export interface POSSoundsController {
    readonly availability: 'ready' | 'unavailable' | 'error'
    playBeep(): void
    playCashRegister(): void
    playError(): void
    playTick(): void
    dispose(): Promise<void>
}

class POSSoundsControllerImpl implements POSSoundsController {
    private availabilityState: POSSoundsController['availability']
    private readonly createAudioContext: (() => AudioContext) | null
    private context: AudioContext | null = null
    private disposed = false
    private readonly timers = new Set<ReturnType<typeof setTimeout>>()
    private readonly nodes = new Set<{ oscillator: OscillatorNode; gain: GainNode }>()

    constructor({
        createAudioContext = typeof window === 'undefined' ? null : () => getAudioContext() as AudioContext,
        prefersReducedMotion = () => typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
    }: POSSoundsControllerOptions) {
        this.createAudioContext = createAudioContext
        this.availabilityState = !createAudioContext || prefersReducedMotion() ? 'unavailable' : 'ready'
    }

    get availability() {
        return this.availabilityState
    }

    private ensureContext(): AudioContext | null {
        if (this.disposed || this.availabilityState === 'unavailable' || !this.createAudioContext) return null
        try {
            this.context ??= this.createAudioContext()
            if (this.context.state === 'suspended') {
                void this.context.resume().catch(() => { this.availabilityState = 'error' })
            }
            return this.context
        } catch {
            this.availabilityState = 'error'
            return null
        }
    }

    private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3): boolean {
        const audioContext = this.ensureContext()
        if (!audioContext) return false
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        this.nodes.add({ oscillator, gain })
        oscillator.type = type
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
        gain.gain.setValueAtTime(volume, audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + duration)
        return true
    }

    private scheduleTone(delay: number, tone: () => void): void {
        const timer = setTimeout(() => {
            this.timers.delete(timer)
            if (!this.disposed) tone()
        }, delay)
        this.timers.add(timer)
    }

    playBeep(): void {
        this.playTone(1200, 0.1, 'sine', 0.2)
    }

    playCashRegister(): void {
        if (!this.playTone(800, 0.08, 'square', 0.15)) return
        this.scheduleTone(80, () => { this.playTone(1200, 0.08, 'square', 0.15) })
        this.scheduleTone(160, () => { this.playTone(1600, 0.15, 'sine', 0.2) })
    }

    playError(): void {
        this.playTone(200, 0.3, 'sawtooth', 0.15)
    }

    playTick(): void {
        this.playTone(600, 0.05, 'sine', 0.1)
    }

    async dispose(): Promise<void> {
        if (this.disposed) return
        this.disposed = true
        for (const timer of this.timers) clearTimeout(timer)
        this.timers.clear()
        for (const { oscillator, gain } of this.nodes) {
            try { oscillator.stop() } catch { /* already stopped */ }
            oscillator.disconnect()
            gain.disconnect()
        }
        this.nodes.clear()
        if (this.context && this.context.state !== 'closed') await this.context.close()
        this.context = null
    }
}

export function createPOSSoundsController(options: POSSoundsControllerOptions = {}): POSSoundsController {
    return new POSSoundsControllerImpl(options)
}

export function usePOSSounds() {
    const [controller] = useState(createPOSSoundsController)
    useEffect(() => () => { void controller.dispose() }, [controller])

    /** High-pitched beep — product scanned or added */
    const playBeep = useCallback(() => {
        controller.playBeep()
    }, [controller])

    /** Cha-ching! — sale completed */
    const playCashRegister = useCallback(() => {
        controller.playCashRegister()
    }, [controller])

    /** Low buzz — error */
    const playError = useCallback(() => {
        controller.playError()
    }, [controller])

    /** Subtle tick — quantity change */
    const playTick = useCallback(() => {
        controller.playTick()
    }, [controller])

    return { playBeep, playCashRegister, playError, playTick }
}

/** Trigger haptic feedback on mobile/tablet */
export function triggerHaptic(duration = 50) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(duration)
    }
}
