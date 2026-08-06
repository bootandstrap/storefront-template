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

export function createPOSSoundsController({
    createAudioContext = typeof window === 'undefined' ? null : () => getAudioContext() as AudioContext,
    prefersReducedMotion = () => typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
}: POSSoundsControllerOptions = {}): POSSoundsController {
    let availability: POSSoundsController['availability'] = !createAudioContext || prefersReducedMotion()
        ? 'unavailable'
        : 'ready'
    let context: AudioContext | null = null
    let disposed = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const nodes = new Set<{ oscillator: OscillatorNode; gain: GainNode }>()

    const ensureContext = () => {
        if (disposed || availability === 'unavailable' || !createAudioContext) return null
        try {
            context ??= createAudioContext()
            if (context.state === 'suspended') void context.resume().catch(() => { availability = 'error' })
            return context
        } catch {
            availability = 'error'
            return null
        }
    }
    const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
        const audioContext = ensureContext()
        if (!audioContext) return false
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        nodes.add({ oscillator, gain })
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
    const scheduleTone = (delay: number, tone: () => void) => {
        const timer = setTimeout(() => {
            timers.delete(timer)
            if (!disposed) tone()
        }, delay)
        timers.add(timer)
    }

    return {
        get availability() { return availability },
        playBeep: () => playTone(1200, 0.1, 'sine', 0.2),
        playCashRegister() {
            if (!playTone(800, 0.08, 'square', 0.15)) return
            scheduleTone(80, () => playTone(1200, 0.08, 'square', 0.15))
            scheduleTone(160, () => playTone(1600, 0.15, 'sine', 0.2))
        },
        playError: () => playTone(200, 0.3, 'sawtooth', 0.15),
        playTick: () => playTone(600, 0.05, 'sine', 0.1),
        async dispose() {
            if (disposed) return
            disposed = true
            for (const timer of timers) clearTimeout(timer)
            timers.clear()
            for (const { oscillator, gain } of nodes) {
                try { oscillator.stop() } catch { /* already stopped */ }
                oscillator.disconnect()
                gain.disconnect()
            }
            nodes.clear()
            if (context && context.state !== 'closed') await context.close()
            context = null
        },
    }
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
