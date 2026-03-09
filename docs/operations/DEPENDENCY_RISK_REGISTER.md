# Dependency Risk Register

> Tracks accepted security advisories in transitive dependencies that cannot be directly patched.
> All waivers require a **Review By** date and **Justification**.

---

## Active Acceptances

### GHSA-m7jm-9gc2-mpf2 — fast-xml-parser Entity Encoding Bypass

| Field | Value |
|-------|-------|
| **Package** | `fast-xml-parser` ≥5.0.0 <5.3.5 |
| **Severity** | Critical |
| **Source** | Transitive via `@medusajs/file-s3` → `@aws-sdk/client-s3` → `@aws-sdk/xml-builder` |
| **Impact** | XML entity injection via DOCTYPE names. Only affects server-side S3 file uploads; no user-supplied XML is parsed. |
| **Mitigation** | Medusa file upload is admin-only (authenticated). No user-facing XML parsing. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when `@medusajs/file-s3` releases with patched AWS SDK. |

---

### GHSA-3ppc-4f35-3m26 — minimatch ReDoS (High)

| Field | Value |
|-------|-------|
| **Package** | `minimatch` |
| **Severity** | High |
| **Source** | Transitive via Medusa build dependencies |
| **Impact** | ReDoS via crafted glob patterns. Only used during build/development, not at runtime. |
| **Mitigation** | Build-time only. No user-supplied glob patterns in production. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when upstream dependencies update minimatch. |

---

### GHSA-mw96-cpmx-2vgc — rollup Path Traversal

| Field | Value |
|-------|-------|
| **Package** | `rollup` |
| **Severity** | High |
| **Source** | Transitive via Vite / build tooling |
| **Impact** | Path traversal during build. Build-time only, not shipped to production runtime. |
| **Mitigation** | Build runs in CI/trusted environment. No user input to build pipeline. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade Vite when patched rollup version is available. |

---

### GHSA-7r86-cg39-jmmj — minimatch ReDoS (Moderate)

| Field | Value |
|-------|-------|
| **Package** | `minimatch` |
| **Severity** | Moderate |
| **Source** | Transitive via Medusa build dependencies (different path) |
| **Impact** | Same as GHSA-3ppc-4f35-3m26 — ReDoS in glob matching. |
| **Mitigation** | Build-time only. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | See GHSA-3ppc-4f35-3m26. |

---

### GHSA-23c5-xmqv-rm74 — minimatch ReDoS (Moderate, alternate path)

| Field | Value |
|-------|-------|
| **Package** | `minimatch` |
| **Severity** | Moderate |
| **Source** | Transitive via Medusa dependencies (alternate path) |
| **Impact** | Same as GHSA-3ppc-4f35-3m26 — ReDoS in glob matching. |
| **Mitigation** | Build-time only. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | See GHSA-3ppc-4f35-3m26. |

---

## Expired / Resolved

_None yet._

---

## Additional Transitive Acceptances

### GHSA-jmr7-xgp7-cmfj — fast-xml-parser XSS via Entity

| Field | Value |
|-------|-------|
| **Package** | `fast-xml-parser` ≥5.0.0 <5.3.6 |
| **Severity** | High |
| **Source** | Transitive via `@medusajs/file-s3` → AWS SDK |
| **Impact** | XSS via HTML entity in parsed XML. Server-side only (S3 responses). |
| **Mitigation** | No user-facing XML rendering. Admin-only S3 operations. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when `@medusajs/file-s3` releases with patched AWS SDK. |

---

### GHSA-xf7r-hgr6-v32p — multer Path Traversal

| Field | Value |
|-------|-------|
| **Package** | `multer` <2.1.0 |
| **Severity** | High |
| **Source** | Transitive via Medusa file upload |
| **Impact** | Path traversal in file uploads. Medusa admin-only, file uploads restricted. |
| **Mitigation** | File uploads are admin-only (authenticated). Filenames validated by Medusa. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when Medusa updates multer. |

---

### GHSA-v52c-386h-88mc — multer Denial of Service

| Field | Value |
|-------|-------|
| **Package** | `multer` <2.1.0 |
| **Severity** | High |
| **Source** | Transitive via Medusa |
| **Impact** | DoS via crafted multipart form data. Admin-only endpoints. |
| **Mitigation** | File upload endpoints are admin-only (authenticated). Rate-limited. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when Medusa updates multer. |

---

### GHSA-5528-5vmv-3xc2 — multer DoS (alternate vector)

| Field | Value |
|-------|-------|
| **Package** | `multer` <2.1.1 |
| **Severity** | High |
| **Source** | Transitive via Medusa |
| **Impact** | DoS via multipart parsing. Same scope as GHSA-v52c. |
| **Mitigation** | Admin-only endpoints. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | See GHSA-v52c-386h-88mc. |

---

### GHSA-5c6j-r48x-rmvq — serialize-javascript RCE

| Field | Value |
|-------|-------|
| **Package** | `serialize-javascript` ≤7.0.2 |
| **Severity** | High |
| **Source** | Transitive via build tooling (Vite/Turbo) |
| **Impact** | RCE via crafted serialized JS. Build-time only, not runtime. |
| **Mitigation** | Only used during build process. No user-supplied data serialized. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade build tooling when patch available. |

---

### GHSA-wf6x-7x77-mvgw — immutable Prototype Pollution

| Field | Value |
|-------|-------|
| **Package** | `immutable` <3.8.3 |
| **Severity** | Moderate |
| **Source** | Transitive via SASS/build tooling |
| **Impact** | Prototype pollution via fromJS(). Build-time CSS processing only. |
| **Mitigation** | Build-time only. No user input to CSS compilation. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when SASS updates immutable. |

---

### GHSA-67mh-4wv8-2f99 — esbuild Arbitrary File Access

| Field | Value |
|-------|-------|
| **Package** | `esbuild` ≤0.24.2 |
| **Severity** | Moderate |
| **Source** | Transitive via Vite/build tooling |
| **Impact** | Arbitrary file access during build. Build-time only, CI-controlled. |
| **Mitigation** | Build runs in CI/trusted environment. No user access to build process. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade Vite when patch available. |

---

### GHSA-2g4f-4pwh-qvx6 — ajv ReDoS

| Field | Value |
|-------|-------|
| **Package** | `ajv` <6.14.0 |
| **Severity** | Moderate |
| **Source** | Transitive via Medusa validation |
| **Impact** | ReDoS via crafted JSON Schema. Admin-only schema validation. |
| **Mitigation** | Schemas are pre-defined, not user-supplied. Admin-only. |
| **Review By** | 2026-06-07 |
| **Owner** | Platform team |
| **Action** | Upgrade when Medusa updates ajv. |
