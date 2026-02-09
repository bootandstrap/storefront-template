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
    // Only transform Supabase Storage URLs
    if (src.includes('.supabase.co/storage/v1/object/public/')) {
        // Supabase Image Transformation URL format:
        // /storage/v1/render/image/public/{bucket}/{path}?width=X&quality=Y
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

    // Non-Supabase images: return as-is
    return src
}
