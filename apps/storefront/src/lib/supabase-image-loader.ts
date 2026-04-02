/**
 * Custom next/image loader for Supabase Storage.
 * Uses Supabase's Image Transformation API for on-the-fly resizing + WebP.
 * Falls back to original URL for non-Supabase images.
 */

interface ImageLoaderParams {
    src: string
    width: number
    quality?: number
}

export default function supabaseImageLoader({ src, width, quality }: ImageLoaderParams): string {
    // 1. Supabase Storage Transformation
    if (src.includes('.supabase.co/storage/v1/object/public/')) {
        const transformed = src.replace(
            '/storage/v1/object/public/',
            '/storage/v1/render/image/public/'
        )
        const params = new URLSearchParams({
            width: String(width),
            quality: String(quality || 75),
        })
        return `${transformed}?${params.toString()}`
    }

    // 2. Unsplash Image Optimization
    if (src.includes('images.unsplash.com')) {
        // Unsplash accepts w (width) and q (quality) parameters
        // We ensure we only append if not already present or replace them
        const url = new URL(src)
        url.searchParams.set('w', String(width))
        url.searchParams.set('q', String(quality || 75))
        url.searchParams.set('auto', 'format') // Force modern formats
        return url.toString()
    }

    // 3. Fallback: Return as-is
    return src
}
