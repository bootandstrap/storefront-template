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
            // Forces HTTPS for 1 year (31536000s) including subdomains.
            // Once set, browsers will refuse HTTP connections.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
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
  // ── Old Panel Route Redirects ──────────────────
  async redirects() {
    return [
      {
        source: "/:lang/tienda",
        destination: "/:lang/productos",
        permanent: true,
      },
      {
        source: "/:lang/panel/productos",
        destination: "/:lang/panel/catalogo?tab=products",
        permanent: true,
      },
      {
        source: "/:lang/panel/categorias",
        destination: "/:lang/panel/catalogo?tab=categories",
        permanent: true,
      },
      {
        source: "/:lang/panel/insignias",
        destination: "/:lang/panel/catalogo",
        permanent: true,
      },
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
