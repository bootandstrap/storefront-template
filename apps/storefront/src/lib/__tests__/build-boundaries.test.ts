import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const STOREFRONT_ROOT = join(__dirname, "../../..");

const readStorefrontFile = (path: string) =>
  readFileSync(join(STOREFRONT_ROOT, path), "utf-8");
const readWorkspaceFile = (path: string) =>
  readFileSync(join(STOREFRONT_ROOT, "../..", path), "utf-8");

describe("production build boundaries", () => {
  it("does not fetch dynamic sitemap data during production build", () => {
    const sitemap = readStorefrontFile("src/app/sitemap.ts");

    expect(sitemap).toContain(
      'import { isBuildPhase } from "@/lib/governance/tenant"',
    );
    expect(sitemap).toContain("if (!isBuildPhase())");
  });

  it("does not resolve Medusa regions during production build", () => {
    const region = readStorefrontFile("src/lib/medusa/region.ts");

    expect(region).toContain("if (isBuildPhase()) return cachedRegions ?? []");
  });

  it("validates Medusa admin credentials only when the API is used", () => {
    const adminCore = readStorefrontFile("src/lib/medusa/admin-core.ts");
    const validation = adminCore.indexOf("if (!MEDUSA_ADMIN_PASSWORD)");
    const tokenResolver = adminCore.indexOf("async function getAdminToken");

    expect(validation).toBeGreaterThan(tokenResolver);
  });

  it("lets Next own immutable cache headers for hashed framework assets", () => {
    const nextConfig = readStorefrontFile("next.config.ts");

    expect(nextConfig).not.toContain('source: "/_next/static/:path*"');
  });

  it("tracks build outputs for every compiled workspace package", () => {
    const turbo = readWorkspaceFile("turbo.json");

    expect(turbo).toContain('"@bootandstrap/platform-contract#build"');
    expect(turbo).toContain('"@bootandstrap/tenant-context#build"');
  });
});
