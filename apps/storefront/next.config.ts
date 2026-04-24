import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,

  // Monorepo: absolute path to workspace root for Turbopack
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },

  images: {
    loader: "custom",
    loaderFile: "./src/lib/supabase-image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },

  // ── Security + CDN Headers ─────────────────────────
  // NOTE: Content-Security-Policy is handled dynamically in proxy.ts
  // with a per-request nonce — it CANNOT be set here (static headers
  // don't support nonces, and inline scripts would break).
  async headers() {
    return [
      // ── Global security headers ──
      // Applied to every request. Defense-in-depth against common web attacks.
      {
        source: "/(.*)",
        headers: [
          {
            // Prevents clickjacking — blocks the site from being embedded in <iframe>
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Prevents MIME type sniffing — browser must respect Content-Type
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Controls Referer header leakage — full URL only to same origin,
            // origin-only to cross-origin (protects sensitive URL paths)
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Restricts browser API access — camera, microphone, geolocation
            // disabled by default (can be enabled per-page if needed)
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Enables DNS prefetching for <a> links — faster navigation
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            // Forces HTTPS for 2 years (63072000s) including subdomains.
            // Once set, browsers will refuse HTTP connections.
            // 2-year max-age meets HSTS Preload List requirements for future inscription.
            // To enable preload: submit domain at https://hstspreload.org, then add '; preload'.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      // ── Static asset caching ──
      // Next.js hashes filenames → safe to cache forever (immutable)
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Image caching ──
      // 1 day fresh + 7 days stale-while-revalidate (serves stale while
      // fetching fresh in background → fast UX with eventual consistency)
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // ── Font caching ──
      // Fonts never change per deployment → cache forever (immutable)
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // ── Legacy Panel Route Redirects ──────────────────
  // Consolidated panel: old individual routes → new tab-based hubs.
  // These are permanent (301) edge redirects — faster than RSC redirect pages.
  async redirects() {
    return [
      // ── Shop routes ──
      { source: "/:lang/tienda", destination: "/:lang/productos", permanent: true },

      // ── Mi Tienda hub ──
      { source: "/:lang/panel/productos", destination: "/:lang/panel/mi-tienda?tab=productos", permanent: true },
      { source: "/:lang/panel/categorias", destination: "/:lang/panel/mi-tienda?tab=categorias", permanent: true },
      { source: "/:lang/panel/catalogo", destination: "/:lang/panel/mi-tienda", permanent: true },
      { source: "/:lang/panel/carrusel", destination: "/:lang/panel/mi-tienda?tab=carrusel", permanent: true },
      { source: "/:lang/panel/paginas", destination: "/:lang/panel/mi-tienda?tab=paginas", permanent: true },
      { source: "/:lang/panel/insignias", destination: "/:lang/panel/mi-tienda?tab=insignias", permanent: true },
      { source: "/:lang/panel/inventario", destination: "/:lang/panel/mi-tienda?tab=inventario", permanent: true },

      // ── Ventas hub ──
      { source: "/:lang/panel/pedidos", destination: "/:lang/panel/ventas?tab=pedidos", permanent: true },
      { source: "/:lang/panel/clientes", destination: "/:lang/panel/ventas?tab=clientes", permanent: true },
      { source: "/:lang/panel/devoluciones", destination: "/:lang/panel/ventas?tab=devoluciones", permanent: true },
      { source: "/:lang/panel/resenas", destination: "/:lang/panel/ventas?tab=resenas", permanent: true },

      // ── Ajustes hub ──
      { source: "/:lang/panel/tienda", destination: "/:lang/panel/ajustes?tab=tienda", permanent: true },
      { source: "/:lang/panel/envios", destination: "/:lang/panel/ajustes?tab=envios", permanent: true },
      { source: "/:lang/panel/idiomas", destination: "/:lang/panel/ajustes?tab=idiomas", permanent: true },
      { source: "/:lang/panel/email", destination: "/:lang/panel/ajustes?tab=email", permanent: true },
      { source: "/:lang/panel/analiticas", destination: "/:lang/panel/ajustes?tab=analiticas", permanent: true },
      { source: "/:lang/panel/suscripcion", destination: "/:lang/panel/ajustes?tab=suscripcion", permanent: true },
      { source: "/:lang/panel/utilidades", destination: "/:lang/panel/ajustes?tab=wifi", permanent: true },
      { source: "/:lang/panel/mi-proyecto", destination: "/:lang/panel/ajustes?tab=proyecto", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI logs during build
  silent: true,

  // Upload source maps then delete from client bundles
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry telemetry
  telemetry: false,
});
