/**
 * POS Sound Effects — Web Audio API
 *
 * Zero-dependency sound system. Respects prefers-reduced-motion.
 * All sounds are synthesized — no audio files needed.
 */
'use client'

import { useCallback, useRef } from 'react'

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

function playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
}

export function usePOSSounds() {
    const ctxRef = useRef<AudioContext | null>(null)

    const ensureCtx = useCallback(() => {
        if (!ctxRef.current) ctxRef.current = getAudioContext()
        if (ctxRef.current?.state === 'suspended') ctxRef.current.resume()
        return ctxRef.current
    }, [])

    /** High-pitched beep — product scanned or added */
    const playBeep = useCallback(() => {
        const ctx = ensureCtx()
        if (!ctx) return
        playTone(ctx, 1200, 0.1, 'sine', 0.2)
    }, [ensureCtx])

    /** Cha-ching! — sale completed */
    const playCashRegister = useCallback(() => {
        const ctx = ensureCtx()
        if (!ctx) return
        playTone(ctx, 800, 0.08, 'square', 0.15)
        setTimeout(() => playTone(ctx, 1200, 0.08, 'square', 0.15), 80)
        setTimeout(() => playTone(ctx, 1600, 0.15, 'sine', 0.2), 160)
    }, [ensureCtx])

    /** Low buzz — error */
    const playError = useCallback(() => {
        const ctx = ensureCtx()
        if (!ctx) return
        playTone(ctx, 200, 0.3, 'sawtooth', 0.15)
    }, [ensureCtx])

    /** Subtle tick — quantity change */
    const playTick = useCallback(() => {
        const ctx = ensureCtx()
        if (!ctx) return
        playTone(ctx, 600, 0.05, 'sine', 0.1)
    }, [ensureCtx])

    return { playBeep, playCashRegister, playError, playTick }
}

/** Trigger haptic feedback on mobile/tablet */
export function triggerHaptic(duration = 50) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(duration)
    }
}
