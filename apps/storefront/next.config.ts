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
  async headers() {
    return [
      // ── Global security headers ──
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // NOTE: Content-Security-Policy is set dynamically per-request
          // in proxy.ts with a nonce — not here (static headers can't use nonces).
        ],
      },
      // ── Static asset caching (hashed filenames → immutable) ──
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Image caching (1 day + stale-while-revalidate 7 days) ──
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // ── Font caching (1 year, immutable) ──
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
