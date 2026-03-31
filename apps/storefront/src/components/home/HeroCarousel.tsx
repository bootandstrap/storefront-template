'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

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
    labels?: {
        carouselLabel?: string
        previousSlide?: string
        nextSlide?: string
        goToSlide?: string
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeroCarousel({ slides, labels }: HeroCarouselProps) {
    const total = slides.length

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop: true,
            align: 'start',
            skipSnaps: false,
        },
        total > 1
            ? [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
            : []
    )

    const [selectedIndex, setSelectedIndex] = useState(0)
    const [scrollProgress, setScrollProgress] = useState(0)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedScrollSnap())
    }, [emblaApi])

    const onScroll = useCallback(() => {
        if (!emblaApi) return
        const progress = Math.max(0, Math.min(1, emblaApi.scrollProgress()))
        setScrollProgress(progress)
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on('select', onSelect)
        emblaApi.on('scroll', onScroll)
        return () => {
            emblaApi.off('select', onSelect)
            emblaApi.off('scroll', onScroll)
        }
    }, [emblaApi, onSelect, onScroll])

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
    const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

    if (total === 0) return null

    return (
        <section
            className="relative overflow-hidden rounded-2xl min-h-[420px] md:min-h-[520px]"
            role="region"
            aria-label={labels?.carouselLabel || 'Offers carousel'}
            aria-roledescription="carousel"
        >
            {/* Embla viewport */}
            <div className="overflow-hidden h-full" ref={emblaRef}>
                <div className="flex h-full" style={{ touchAction: 'pan-y pinch-zoom' }}>
                    {slides.map((s, i) => (
                        <div
                            key={s.id}
                            className="relative flex-[0_0_100%] min-w-0 min-h-[420px] md:min-h-[520px]"
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${labels?.goToSlide || 'Slide'} ${i + 1}`}
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
                                    loading={i === 0 ? undefined : 'lazy'}
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand to-brand-400" />
                            )}

                            {/* Multi-stop overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                            {/* Content */}
                            <div className="relative z-10 h-full flex items-center">
                                <div className="container-page py-16 md:py-24">
                                    <div className="max-w-2xl space-y-5">
                                        {s.title && (
                                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display text-white leading-tight animate-slide-up-stagger stagger-1">
                                                {s.title}
                                            </h2>
                                        )}
                                        {s.subtitle && (
                                            <p className="text-base sm:text-lg md:text-xl text-white/85 leading-relaxed max-w-xl animate-slide-up-stagger stagger-2">
                                                {s.subtitle}
                                            </p>
                                        )}
                                        {s.cta_text && s.cta_url && (
                                            <div className="animate-slide-up-stagger stagger-3">
                                                <Link
                                                    href={s.cta_url}
                                                    className="btn btn-accent btn-shimmer text-base px-8 py-3.5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
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
                </div>
            </div>

            {/* Navigation arrows */}
            {total > 1 && (
                <>
                    <button
                        onClick={scrollPrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-all duration-200 active:scale-95"
                        aria-label={labels?.previousSlide || 'Previous slide'}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={scrollNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-all duration-200 active:scale-95"
                        aria-label={labels?.nextSlide || 'Next slide'}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Progress bar + dot indicators */}
            {total > 1 && (
                <div className="absolute bottom-0 left-0 right-0 z-20">
                    {/* Progress bar */}
                    <div className="h-1 bg-white/10">
                        <div
                            className="h-full bg-white/60 transition-all duration-300 ease-out"
                            style={{ width: `${((selectedIndex + 1) / total) * 100}%` }}
                        />
                    </div>

                    {/* Dots */}
                    <div className="flex items-center justify-center gap-2 py-4">
                        {slides.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => scrollTo(i)}
                                className={`rounded-full transition-all duration-300 ${
                                    i === selectedIndex
                                        ? 'bg-white w-8 h-2.5'
                                        : 'bg-white/40 w-2.5 h-2.5 hover:bg-white/60'
                                }`}
                                aria-label={`${labels?.goToSlide || 'Go to slide'} ${i + 1}`}
                                aria-current={i === selectedIndex ? 'true' : undefined}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
