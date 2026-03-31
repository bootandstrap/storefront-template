'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ZoomIn, Package } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/counter.css'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImageZoomProps {
    src: string
    alt: string
    width: number
    height: number
    className?: string
    /** All images for lightbox gallery navigation */
    images?: { url: string; alt?: string }[]
    /** Index of this image within the images array */
    imageIndex?: number
}

// ---------------------------------------------------------------------------
// Component — Hover lens zoom + click-to-lightbox
// ---------------------------------------------------------------------------

/**
 * ImageZoom — hover lens zoom (desktop) + click to open YARL lightbox
 *
 * Replaces custom fullscreen with `yet-another-react-lightbox`:
 * - Pinch-to-zoom on mobile
 * - Swipe navigation
 * - Thumbnail strip
 * - Image counter
 * - Keyboard navigation (arrows, Escape)
 * - Smooth zoom animations
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
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(imageIndex)

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

    const openLightbox = useCallback(() => {
        setLightboxIndex(imageIndex)
        setLightboxOpen(true)
    }, [imageIndex])

    // Build slides array for YARL
    const slides = images.length > 0
        ? images.map(img => ({ src: img.url, alt: img.alt || alt }))
        : [{ src, alt }]

    return (
        <>
            {/* Zoomable image container */}
            <div
                ref={containerRef}
                className={`image-zoom-container ${className}`}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={openLightbox}
                role="button"
                tabIndex={0}
                aria-label={`Zoom image: ${alt}`}
                onKeyDown={(e) => e.key === 'Enter' && openLightbox()}
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

            {/* YARL Lightbox — replaces custom fullscreen */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={slides}
                plugins={[Zoom, Thumbnails, Counter]}
                zoom={{
                    maxZoomPixelRatio: 4,
                    zoomInMultiplier: 2,
                    doubleTapDelay: 300,
                    doubleClickDelay: 300,
                    doubleClickMaxStops: 2,
                    keyboardMoveDistance: 50,
                    wheelZoomDistanceFactor: 100,
                    pinchZoomDistanceFactor: 100,
                    scrollToZoom: true,
                }}
                thumbnails={{
                    position: 'bottom',
                    width: 80,
                    height: 80,
                    border: 2,
                    borderRadius: 8,
                    gap: 8,
                    padding: 0,
                }}
                counter={{
                    container: { style: { top: 'unset', bottom: 0, left: '50%', transform: 'translateX(-50%)' } },
                }}
                styles={{
                    container: { backgroundColor: 'rgba(0, 0, 0, 0.92)' },
                    button: { filter: 'none' },
                }}
                animation={{
                    fade: 300,
                    swipe: 300,
                }}
                carousel={{
                    finite: false,
                    preload: 2,
                }}
                controller={{
                    closeOnBackdropClick: true,
                }}
            />
        </>
    )
}
