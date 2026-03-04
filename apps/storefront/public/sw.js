/**
 * Service Worker — Cache-first for images, network-first for API
 *
 * Minimal service worker for PWA installability.
 * Caches product images for offline browsing after first load.
 * API/data requests always go to network to ensure freshness.
 */

const CACHE_NAME = 'storefront-v1'
const IMAGE_CACHE = 'storefront-images-v1'

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
    '/icons/icon-192.png',
    '/icons/icon-512.png',
]

// Install — pre-cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    )
    self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE)
                    .map((key) => caches.delete(key))
            )
        )
    )
    self.clients.claim()
})

// Fetch — strategy per request type
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== 'GET') return

    // Skip API requests (always network)
    if (url.pathname.startsWith('/api/')) return

    // Images: cache-first (fast repeat loads)
    if (
        request.destination === 'image' ||
        url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)
    ) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then(async (cache) => {
                const cached = await cache.match(request)
                if (cached) return cached

                try {
                    const response = await fetch(request)
                    if (response.ok) {
                        cache.put(request, response.clone())
                    }
                    return response
                } catch {
                    // Offline — return placeholder or nothing
                    return new Response('', { status: 503 })
                }
            })
        )
        return
    }

    // Everything else: network-first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful navigations for offline fallback
                if (response.ok && request.mode === 'navigate') {
                    const clone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
                }
                return response
            })
            .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 })))
    )
})
