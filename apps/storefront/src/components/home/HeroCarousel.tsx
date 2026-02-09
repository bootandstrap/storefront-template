'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarouselSlide {
    id: string
    type: 'product' | 'image' | 'offer'
    medusa_product_id: string | null
    image: string | null
    title: string | null
    subtitle: string | null
    cta_text: string | null
    cta_url: string | null
    sort_order: number
    active: boolean
}

interface HeroCarouselProps {
    slides: CarouselSlide[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeroCarousel({ slides }: HeroCarouselProps) {
    const [current, setCurrent] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const total = slides.length

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % total)
    }, [total])

    const prev = useCallback(() => {
        setCurrent((prev) => (prev - 1 + total) % total)
    }, [total])

    // Auto-slide every 5 seconds
    useEffect(() => {
        if (isPaused || total <= 1) return

        timerRef.current = setInterval(next, 5000)
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isPaused, next, total])

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev()
            if (e.key === 'ArrowRight') next()
        },
        [prev, next]
    )

    if (total === 0) return null

    const slide = slides[current]

    return (
        <section
            className="relative overflow-hidden rounded-2xl min-h-[400px] md:min-h-[500px]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="region"
            aria-label="Carrusel de ofertas"
            aria-roledescription="carousel"
        >
            {/* Slides */}
            {slides.map((s, i) => (
                <div
                    key={s.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Slide ${i + 1} de ${total}`}
                    aria-hidden={i !== current}
                >
                    {/* Background */}
                    {s.image ? (
                        <Image
                            src={s.image}
                            alt={s.title || ''}
                            fill
                            sizes="100vw"
                            className="object-cover"
                            priority={i === 0}
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 h-full flex items-center">
                        <div className="container-page py-16 md:py-24">
                            <div className="max-w-2xl">
                                {s.title && (
                                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display text-white leading-tight mb-4 md:mb-6 animate-slide-up">
                                        {s.title}
                                    </h2>
                                )}
                                {s.subtitle && (
                                    <p className="text-base sm:text-lg md:text-xl text-white/80 leading-relaxed mb-8 max-w-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                        {s.subtitle}
                                    </p>
                                )}
                                {s.cta_text && s.cta_url && (
                                    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                        <Link
                                            href={s.cta_url}
                                            className="btn btn-accent text-base px-8 py-3.5"
                                        >
                                            {s.cta_text}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Navigation arrows */}
            {total > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                        aria-label="Slide anterior"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                        aria-label="Siguiente slide"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Dots indicator */}
            {total > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {slides.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => setCurrent(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === current
                                    ? 'bg-white w-8'
                                    : 'bg-white/40 hover:bg-white/60'
                                }`}
                            aria-label={`Ir al slide ${i + 1}`}
                            aria-current={i === current ? 'true' : undefined}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
