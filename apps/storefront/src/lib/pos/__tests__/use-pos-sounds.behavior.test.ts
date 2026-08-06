import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPOSSoundsController } from '../usePOSSounds'

function audioFake() {
    const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = []
    const gains: Array<{ disconnect: ReturnType<typeof vi.fn> }> = []
    const context = {
        state: 'running',
        currentTime: 0,
        destination: {},
        resume: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn(() => {
            const oscillator = {
                type: 'sine',
                frequency: { setValueAtTime: vi.fn() },
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                disconnect: vi.fn(),
            }
            oscillator.connect.mockImplementation(() => gains.at(-1))
            oscillators.push(oscillator)
            return oscillator
        }),
        createGain: vi.fn(() => {
            const gain = {
                gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
                connect: vi.fn(() => gain),
                disconnect: vi.fn(),
            }
            gains.push(gain)
            return gain
        }),
    }
    return { context, oscillators, gains }
}

describe('POS sounds operational contract', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('reports unavailable when Web Audio is missing or reduced motion is requested', () => {
        const missing = createPOSSoundsController({ createAudioContext: null })
        expect(missing.availability).toBe('unavailable')
        missing.playCashRegister()
        expect(vi.getTimerCount()).toBe(0)
        expect(createPOSSoundsController({
            createAudioContext: vi.fn(),
            prefersReducedMotion: () => true,
        }).availability).toBe('unavailable')
    })

    it('cancels delayed tones and closes owned audio resources on dispose', async () => {
        const fake = audioFake()
        const controller = createPOSSoundsController({
            createAudioContext: () => fake.context as unknown as AudioContext,
            prefersReducedMotion: () => false,
        })

        controller.playCashRegister()
        expect(fake.oscillators).toHaveLength(1)
        expect(vi.getTimerCount()).toBe(2)

        await controller.dispose()
        vi.advanceTimersByTime(500)

        expect(fake.oscillators).toHaveLength(1)
        expect(fake.oscillators[0].stop).toHaveBeenCalled()
        expect(fake.oscillators[0].disconnect).toHaveBeenCalled()
        expect(fake.gains[0].disconnect).toHaveBeenCalled()
        expect(fake.context.close).toHaveBeenCalledOnce()
        expect(vi.getTimerCount()).toBe(0)
    })
})
