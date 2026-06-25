import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Test file is at: apps/storefront/src/lib/__tests__/
// Monorepo root is 5 levels up: __tests__ → lib → src → storefront → apps → root
const MONOREPO_ROOT = join(__dirname, "../../../../..");

describe("Agent doc contract", () => {
  it("repo-local Ponytail docs exist and are referenced from the docs index", () => {
    const agentsPath = join(MONOREPO_ROOT, "AGENTS.md");
    const docsReadmePath = join(MONOREPO_ROOT, "docs/README.md");
    const planPath = join(
      MONOREPO_ROOT,
      "docs/plans/2026-06-19-ponytail-adoption.md",
    );

    expect(existsSync(agentsPath)).toBe(true);
    expect(existsSync(docsReadmePath)).toBe(true);
    expect(existsSync(planPath)).toBe(true);

    const docsReadme = readFileSync(docsReadmePath, "utf-8");
    expect(docsReadme).toContain("plans/2026-06-19-ponytail-adoption.md");
    expect(docsReadme).toContain("../AGENTS.md");
  });

  it("Ponytail guardrails preserve runtime semantics and GEMINI precedence", () => {
    const agents = readFileSync(join(MONOREPO_ROOT, "AGENTS.md"), "utf-8");
    const plan = readFileSync(
      join(MONOREPO_ROOT, "docs/plans/2026-06-19-ponytail-adoption.md"),
      "utf-8",
    );

    expect(agents).toContain("tenant runtime and storefront truth");
    expect(agents).toContain("Respect `GEMINI.md` as the primary agent guide");
    expect(agents).toContain(
      "Do not call a healthy tenant runtime proof a complete self-service platform.",
    );

    expect(plan).toContain("`AGENTS.md` no sustituye `GEMINI.md`");
    expect(plan).toContain(
      "no usar Ponytail para vender runtime sano como plataforma self-service completa",
    );
  });
});
