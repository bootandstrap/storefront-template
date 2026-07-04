import type { MetadataRoute } from "next";
import { CANONICAL_ROUTES } from "@/lib/i18n";

interface SitemapContext {
  baseUrl: string;
  activeLocales: string[];
  defaultLocale: string;
}

interface StaticSitemapInput extends SitemapContext {
  now: Date;
}

interface ProductSitemapInput extends SitemapContext {
  products: Array<{ handle: string; updated_at: string }>;
}

interface CmsSitemapInput extends SitemapContext {
  pages: Array<{ slug: string; updated_at: string | null }>;
  now: Date;
}

function buildAlternates(context: SitemapContext, path: string) {
  if (context.activeLocales.length <= 1) return undefined;

  const languages = Object.fromEntries(
    context.activeLocales.map((locale) => [
      locale,
      `${context.baseUrl}/${locale}${path}`,
    ]),
  );
  languages["x-default"] = `${context.baseUrl}/${context.defaultLocale}${path}`;
  return { languages };
}

export function buildStaticSitemapEntries(
  input: StaticSitemapInput,
): MetadataRoute.Sitemap {
  const routes = [
    { path: "", changeFrequency: "daily" as const, priority: 1 },
    {
      path: `/${CANONICAL_ROUTES.products}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    ...["privacidad", "terminos", "cookies", "aviso"].map((slug) => ({
      path: `/legal/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  return input.activeLocales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${input.baseUrl}/${locale}${route.path}`,
      lastModified: input.now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: buildAlternates(input, route.path),
    })),
  );
}

export function buildProductSitemapEntries(
  input: ProductSitemapInput,
): MetadataRoute.Sitemap {
  return input.activeLocales.flatMap((locale) =>
    input.products.map((product) => {
      const path = `/${CANONICAL_ROUTES.products}/${product.handle}`;
      return {
        url: `${input.baseUrl}/${locale}${path}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: buildAlternates(input, path),
      };
    }),
  );
}

export function buildCmsSitemapEntries(
  input: CmsSitemapInput,
): MetadataRoute.Sitemap {
  return input.activeLocales.flatMap((locale) =>
    input.pages.map((page) => {
      const path = `/paginas/${page.slug}`;
      return {
        url: `${input.baseUrl}/${locale}${path}`,
        lastModified: page.updated_at ? new Date(page.updated_at) : input.now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: buildAlternates(input, path),
      };
    }),
  );
}
