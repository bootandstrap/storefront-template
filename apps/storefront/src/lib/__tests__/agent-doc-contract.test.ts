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

  it("routes reusable runtime work through the canonical template", () => {
    const agents = readFileSync(join(MONOREPO_ROOT, "AGENTS.md"), "utf-8");
    const gemini = readFileSync(join(MONOREPO_ROOT, "GEMINI.md"), "utf-8");
    const plan = readFileSync(
      join(MONOREPO_ROOT, "docs/plans/2026-06-19-ponytail-adoption.md"),
      "utf-8",
    );

    for (const adapter of [agents, gemini]) {
      expect(adapter).toContain("canonical tenant runtime template");
      expect(adapter).toContain(
        "../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md",
      );
      expect(adapter).toContain("Template-first propagation");
    }

    expect(plan).toContain(
      "../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md",
    );
    expect(plan).toContain("AGENTS.md` y `GEMINI.md` son adapters locales");
    expect(plan).toContain("runtime sano como plataforma self-service completa");
  });

  it("keeps schema ownership enforceable in a standalone checkout", () => {
    expect(existsSync(join(MONOREPO_ROOT, "schema-ownership.json"))).toBe(true);
    expect(
      existsSync(join(MONOREPO_ROOT, "scripts/check-schema-ownership.sh")),
    ).toBe(true);

    const releaseGate = readFileSync(
      join(MONOREPO_ROOT, "scripts/release-gate.sh"),
      "utf-8",
    );
    const workflow = readFileSync(
      join(MONOREPO_ROOT, ".github/workflows/ci.yml"),
      "utf-8",
    );

    expect(releaseGate).toContain(
      'gate "Schema Ownership" bash scripts/check-schema-ownership.sh data-plane',
    );
    expect(workflow).toContain(
      "bash scripts/check-schema-ownership.sh data-plane",
    );
    expect(workflow).not.toContain("Schema ownership script not in workspace");
  });
});
