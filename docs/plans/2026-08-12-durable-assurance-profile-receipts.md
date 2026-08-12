# Durable assurance profile receipts implementation plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve independently verifiable fast and full assurance executions for one exact clean revision without allowing either profile to invalidate the other.

**Architecture:** `run-assurance.mjs` keeps its existing canonical output for compatibility and additionally snapshots the completed profile into a profile-owned directory. The snapshot copies the summary, every referenced task receipt, and every declared task output, then seals their hashes in a manifest. A sequential `assurance:profiles` command runs forced-no-cache fast and full profiles and emits a combined receipt only after both snapshot manifests and archived bytes validate against the same revision and clean working tree.

**Tech Stack:** Node.js ESM, native filesystem/crypto/child-process APIs, Node test runner, pnpm assurance DAG.

---

## Design decision

Three approaches were considered:

1. Keep only `.artifacts/assurance/summary.json`. This preserves compatibility but the next profile overwrites the previous proof.
2. Give fast and full separate summary/task paths. This still leaves task outputs such as the dependency audit shared and mutable, so an older receipt can become unverifiable.
3. Snapshot every authoritative byte per profile and seal a combined manifest. This uses more local artifact space but preserves exact evidence and is the selected minimum correct design.

The combined receipt is not a new functional or deployment claim. It proves only deterministic developer feedback: fast and full ran sequentially, forced cache bypass, on the same clean revision, with verifiable task timings and archived outputs. Missing, stale, malformed, symlinked, hash-mismatched, cached, interrupted, failed, cross-revision, or dirty-tree evidence fails closed.

## Task 1: Specify snapshot and combined-receipt validation

**Files:**
- Create: `scripts/assurance-profile-receipts.test.mjs`
- Create: `scripts/lib/assurance-profile-receipts.mjs`

1. Write fixtures for exact fast/full summary, task receipts and task outputs.
2. Assert a valid profile snapshot copies every authoritative byte and records start/end/duration per task.
3. Assert combined validation rejects missing profile, cross-revision, dirty tree, reusable/cache execution, invalid timing, symlink and byte/hash mismatch.
4. Run the focused test and observe RED because the producer does not exist.
5. Implement the minimum snapshot and validation functions.
6. Run the focused test to GREEN.

## Task 2: Integrate snapshots with profile execution

**Files:**
- Modify: `scripts/run-assurance.mjs`
- Create: `scripts/run-assurance-profiles.mjs`
- Modify: `scripts/assurance-dag.test.mjs`
- Modify: `scripts/assurance-tasks.json`
- Modify: `package.json`

1. Write failing integration assertions that the new producer, verifier and wrapper are hashed by `assurance-contracts`.
2. Snapshot a profile only after its canonical summary is atomically written.
3. Run fast then full sequentially; reject forwarded options other than `--no-cache`; require it for the SOTA receipt path.
4. Verify both snapshots and atomically write `.artifacts/assurance/profile-set.json`.
5. Add `assurance:profiles` and `assurance:verify-profiles` scripts.
6. Run focused contract tests.

## Task 3: Execute and propagate exact evidence

**Files:**
- Governed template files above
- Matching tenant governed files
- Generated `.artifacts/assurance/**` receipts, never hand-edited

1. Commit the source contract in template.
2. Run `pnpm assurance:profiles -- --no-cache` on the clean template revision.
3. Verify the combined receipt and run artifact leak checks.
4. Propagate only governed template changes byte-for-byte to tenant with template provenance.
5. Commit tenant propagation and execute the same profiles command on its clean revision.
6. Preserve exact hashes for BSWEB scorecard ingestion.
