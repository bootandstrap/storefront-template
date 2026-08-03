# Sentrux baseline review — 2026-08-03

## Read-only execution

- Tool: `sentrux 0.5.7`
- Command: `sentrux gate .`
- Repository revision: `19e493c48bc0c0a98b130c6e335fc24b2e7744cd`
- Baseline files: `.sentrux/baseline.json`, `.sentrux/rules.toml`
- Baseline mutation: none (`git diff --exit-code` returned 0)
- Save mode: not executed; `sentrux gate --save .` remains prohibited

Exact summary:

```text
Quality:      6289 -> 6382
Coupling:     0.03 → 0.03
Cycles:       0 → 0
God files:    0 → 0
Distance from Main Sequence: 0.51

✗ DEGRADED
  ✗ Complex functions increased: 37 → 45
```

The scan covered 1,657 kept tracked files, 2,895 resolved import edges, 4,072
call edges, and 6 inheritance edges. The gate exited non-zero because the
complex-function count increased by eight.

## Finding classification

This is an unresolved code-structure regression finding, not permission to
change policy. The normal gate reports the aggregate count but not the eight
function identities, so this review does not invent file-level defects. Task 9
must use changed-file review/Fallow evidence to identify actionable functions
and distinguish new defects from pre-existing functions newly visible to the
scanner.

Raising the saved allowance from 37 to 45 would be a baseline-policy change,
not a code fix. No such delta was generated or accepted. The frozen baseline
and architectural rules remain intact. If later analysis demonstrates scanner
classification drift, a proposed baseline delta must be generated only in a
validated temporary directory, reviewed separately, and never copied into the
repository without explicit authorization.

## Gate consequence

Task 8 records the degraded result truthfully and does not claim green. It does
not block documentation of the boundary decision, but Task 9 cannot declare the
template phase complete until the structural finding is either fixed with
fresh evidence or explicitly reported as a real blocker. No release, deploy,
merge, commercial-readiness, or production-readiness claim follows from this
review.
