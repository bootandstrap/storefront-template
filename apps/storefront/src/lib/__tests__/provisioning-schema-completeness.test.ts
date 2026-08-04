/**
 * Provisioning Schema Completeness Test
 *
 * Validates that governance-contract.json flags/limits ALL exist as
 * provisioning-ready keys in the generated database contract.
 *
 * This catches the root cause of "silently ignored flags" — when a new module
 * adds flags to the contract but nobody propagates the corresponding DB
 * columns into the runtime's generated types.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import contract from "../governance-contract.json";

// ─── Contract key accessors ─────────────────────────────────
// contract.flags = { count, keys: string[], groups }
// contract.limits = { count, keys: string[], numeric_keys: string[], metadata_keys }
const contractFlagKeys: string[] = contract.flags.keys;
const contractLimitKeys: string[] = contract.limits.numeric_keys;

describe("Provisioning Schema Completeness", () => {
  describe("generated database contract covers governance keys", () => {
    const databaseTypes = fs.readFileSync(
      path.resolve(
      process.cwd(),
      "src/lib/supabase/database.types.ts",
      ),
      "utf8",
    );

    it("generated feature_flags row exposes all contract flags", () => {
      const missingFromTypes = contractFlagKeys.filter(
        (flag: string) => !new RegExp(`\\b${flag}\\??:\\s*boolean`).test(databaseTypes),
      );
      expect(missingFromTypes).toEqual([]);
    });

    it("generated plan_limits row exposes all numeric contract limits", () => {
      const missingFromTypes = contractLimitKeys.filter(
        (limit: string) => !new RegExp(`\\b${limit}\\??:\\s*number`).test(databaseTypes),
      );
      expect(missingFromTypes).toEqual([]);
    });
  });

  describe("governance contract structural invariants", () => {
    it("contract has 40+ flags", () => {
      expect(contractFlagKeys.length).toBeGreaterThan(40);
    });

    it("contract has 20+ limits", () => {
      expect(contractLimitKeys.length).toBeGreaterThan(20);
    });

    it("contract has modules catalog with 10+ modules", () => {
      expect(
        Object.keys(contract.modules.catalog).length,
      ).toBeGreaterThanOrEqual(10);
    });

    it("every module tier has features array and positive price", () => {
      const catalog = contract.modules.catalog as unknown as Array<{
        key: string;
        tiers: Array<{
          key: string;
          name: string;
          price_chf: number;
          features: string[];
        }>;
      }>;
      const issues: string[] = [];
      for (const mod of catalog) {
        for (const tier of mod.tiers) {
          if (
            !tier.features ||
            !Array.isArray(tier.features) ||
            tier.features.length === 0
          ) {
            issues.push(`${mod.key}.${tier.key}: missing/empty features`);
          }
          if (typeof tier.price_chf !== "number" || tier.price_chf <= 0) {
            issues.push(`${mod.key}.${tier.key}: price_chf=${tier.price_chf}`);
          }
        }
      }
      expect(issues).toEqual([]);
    });

    it("every module has unique tier keys within itself", () => {
      const catalog = contract.modules.catalog as unknown as Array<{
        key: string;
        tiers: Array<{ key: string }>;
      }>;
      const issues: string[] = [];
      for (const mod of catalog) {
        const seenKeys = new Set<string>();
        for (const tier of mod.tiers) {
          if (seenKeys.has(tier.key)) {
            issues.push(`${mod.key}: duplicate tier key "${tier.key}"`);
          }
          seenKeys.add(tier.key);
        }
      }
      expect(issues).toEqual([]);
    });
  });
});
