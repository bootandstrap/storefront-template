import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/medusa/client";
import { getConfig, getRequiredTenantId } from "@/lib/config";
import { isBuildPhase } from "@/lib/governance/tenant";
import { getActiveLocales } from "@/lib/i18n";
import {
  buildCmsSitemapEntries,
  buildProductSitemapEntries,
  buildStaticSitemapEntries,
} from "@/lib/seo/sitemap-entries";
import { getPublicBaseUrl } from "@/lib/seo/public-url";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getPublicBaseUrl();
  const { config } = await getConfig();
  const activeLocales = getActiveLocales(config);
  const sitemapContext = {
    baseUrl,
    activeLocales,
    defaultLocale: config.language || "en",
  };
  const entries = buildStaticSitemapEntries({
    ...sitemapContext,
    now: new Date(),
  });

  if (!isBuildPhase()) {
    // Dynamic product pages per locale — paginate to fetch ALL products
    try {
      const PAGE_SIZE = 200;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { products } = await getProducts({ limit: PAGE_SIZE, offset });
        entries.push(
          ...buildProductSitemapEntries({ ...sitemapContext, products }),
        );
        hasMore = products.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }
    } catch {
      // Products unavailable — return static pages only
    }

    // Published CMS pages (paginas/[slug]) — from Supabase
    try {
      const tenantId = getRequiredTenantId();
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("cms_pages")
        .select("slug, updated_at")
        .eq("tenant_id", tenantId)
        .eq("published", true);

      const pages = (data || []) as Array<{
        slug: string;
        updated_at: string | null;
      }>;
      entries.push(
        ...buildCmsSitemapEntries({ ...sitemapContext, pages, now: new Date() }),
      );
    } catch {
      // CMS pages unavailable — skip section
    }
  }

  return entries;
}
