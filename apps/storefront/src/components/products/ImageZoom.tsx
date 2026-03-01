'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface ImageZoomProps {
    src: string
    alt: string
    width: number
    height: number
    className?: string
    /** All images for fullscreen gallery navigation */
    images?: { url: string; alt?: string }[]
    /** Index of this image within the images array */
    imageIndex?: number
}

/**
 * ImageZoom — hover lens zoom + click-to-fullscreen gallery
 *
 * Hover: magnified lens follows cursor position (desktop only)
 * Click: fullscreen overlay with left/right navigation
 * Touch: tap to open fullscreen, swipe to navigate
 */
export default function ImageZoom({
    src,
    alt,
    width,
    height,
    className = '',
    images = [],
    imageIndex = 0,
}: ImageZoomProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isHovering, setIsHovering] = useState(false)
    const [lensPosition, setLensPosition] = useState({ x: 50, y: 50 })
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [fullscreenIndex, setFullscreenIndex] = useState(imageIndex)

    const ZOOM_FACTOR = 2.5

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setLensPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
    }, [])

    const handleMouseEnter = useCallback(() => setIsHovering(true), [])
    const handleMouseLeave = useCallback(() => setIsHovering(false), [])

    const openFullscreen = useCallback(() => {
        setFullscreenIndex(imageIndex)
        setIsFullscreen(true)
    }, [imageIndex])

    const closeFullscreen = useCallback(() => setIsFullscreen(false), [])

    const navigateFullscreen = useCallback((direction: 'prev' | 'next') => {
        if (images.length <= 1) return
        setFullscreenIndex((prev) =>
            direction === 'next'
                ? (prev + 1) % images.length
                : (prev - 1 + images.length) % images.length
        )
    }, [images.length])

    // Keyboard navigation in fullscreen
    useEffect(() => {
        if (!isFullscreen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeFullscreen()
            if (e.key === 'ArrowLeft') navigateFullscreen('prev')
            if (e.key === 'ArrowRight') navigateFullscreen('next')
        }
        window.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [isFullscreen, closeFullscreen, navigateFullscreen])

    const currentFullscreenImage = images.length > 0
        ? images[fullscreenIndex]
        : { url: src, alt }

    return (
        <>
            {/* Zoomable image container */}
            <div
                ref={containerRef}
                className={`image-zoom-container ${className}`}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={openFullscreen}
                role="button"
                tabIndex={0}
                aria-label={`Zoom image: ${alt}`}
                onKeyDown={(e) => e.key === 'Enter' && openFullscreen()}
            >
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    className="image-zoom-base"
                    priority
                />

                {/* Zoom overlay — desktop only */}
                {isHovering && (
                    <div
                        className="image-zoom-lens"
                        style={{
                            backgroundImage: `url(${src})`,
                            backgroundSize: `${ZOOM_FACTOR * 100}%`,
                            backgroundPosition: `${lensPosition.x}% ${lensPosition.y}%`,
                        }}
                    />
                )}

                {/* Zoom hint icon */}
                <div className="image-zoom-hint">
                    <ZoomIn className="w-4 h-4" />
                </div>
            </div>

            {/* Fullscreen overlay */}
            {isFullscreen && (
                <div
                    className="image-zoom-fullscreen"
                    onClick={closeFullscreen}
                >
                    {/* Close button */}
                    <button
                        className="image-zoom-close"
                        onClick={closeFullscreen}
                        aria-label="Close fullscreen"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Image */}
                    <div
                        className="image-zoom-fullscreen-image"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={currentFullscreenImage.url}
                            alt={currentFullscreenImage.alt || alt}
                            fill
                            className="object-contain"
                            sizes="100vw"
                        />
                    </div>

                    {/* Navigation arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                className="image-zoom-nav image-zoom-nav-prev"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    navigateFullscreen('prev')
                                }}
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                className="image-zoom-nav image-zoom-nav-next"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    navigateFullscreen('next')
                                }}
                                aria-label="Next image"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            {/* Dots indicator */}
                            <div className="image-zoom-dots">
                                {images.map((_, i) => (
                                    <button
                                        key={i}
                                        className={`image-zoom-dot ${i === fullscreenIndex ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFullscreenIndex(i)
                                        }}
                                        aria-label={`Go to image ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    )
}
