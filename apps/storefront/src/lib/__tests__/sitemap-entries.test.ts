import { describe, expect, it } from "vitest";
import {
  buildCmsSitemapEntries,
  buildProductSitemapEntries,
  buildStaticSitemapEntries,
} from "@/lib/seo/sitemap-entries";

const common = {
  baseUrl: "https://example.test",
  activeLocales: ["es", "en"],
  defaultLocale: "es",
};

describe("sitemap entry builders", () => {
  it("builds localized static routes with canonical alternates", () => {
    const now = new Date("2026-07-02T00:00:00.000Z");
    const entries = buildStaticSitemapEntries({ ...common, now });

    expect(entries).toHaveLength(12);
    expect(entries[0]).toEqual({
      url: "https://example.test/es",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: {
          es: "https://example.test/es",
          en: "https://example.test/en",
          "x-default": "https://example.test/es",
        },
      },
    });
  });

  it("builds product entries for every active locale", () => {
    const updatedAt = "2026-07-01T12:00:00.000Z";
    const entries = buildProductSitemapEntries({
      ...common,
      products: [{ handle: "apple", updated_at: updatedAt }],
    });

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://example.test/es/productos/apple",
      "https://example.test/en/productos/apple",
    ]);
    expect(entries[0].lastModified).toEqual(new Date(updatedAt));
  });

  it("builds published CMS entries and preserves nullable timestamps", () => {
    const entries = buildCmsSitemapEntries({
      ...common,
      now: new Date("2026-07-02T00:00:00.000Z"),
      pages: [{ slug: "about", updated_at: null }],
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      url: "https://example.test/es/paginas/about",
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });
});
