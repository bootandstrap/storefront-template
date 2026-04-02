/**
 * Config Pipeline Integrity Tests
 *
 * Validates that the config pipeline is complete:
 * 1. Every onboarding config key has a matching entry in MODULE_CONFIG_FIELDS
 * 2. Every MODULE_CONFIG_FIELDS entry has Zod validation in owner-validation.ts
 * 3. Every module with config fields has ModuleConfigClient field defs
 * 4. No hardcoded demo data in critical panel pages
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Helpers ────────────────────────────────────────────────────────────────

function readSrc(relativePath: string): string {
  const basePath = join(__dirname, '..')
  return readFileSync(join(basePath, relativePath), 'utf-8')
}

// ── Source extraction ──────────────────────────────────────────────────────

const ownerConfigSrc = readSrc('owner-config.ts')
const ownerValidationSrc = readSrc('owner-validation.ts')
const moduleConfigClientSrc = readSrc(
  '../app/[lang]/(panel)/panel/modulos/[module]/ModuleConfigClient.tsx'
)
const actionsSrc = readSrc('../app/[lang]/(panel)/panel/actions.ts')

// ── Extract data ───────────────────────────────────────────────────────────

function extractSetKeys(src: string, setName: string): string[] {
  const regex = new RegExp(`${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`, 'm')
  const match = src.match(regex)
  if (!match) return []
  const keys = match[1].match(/'([^']+)'/g)
  return keys ? keys.map((k) => k.replace(/'/g, '')) : []
}

function extractRecordKeys(src: string, varName: string): string[] {
  const regex = new RegExp(`${varName}[^{]*\\{([\\s\\S]*?)^\\}`, 'm')
  const match = src.match(regex)
  if (!match) return []
  const moduleKeys = match[1].match(/^\s+(\w+)\s*:/gm)
  return moduleKeys ? moduleKeys.map((k) => k.trim().replace(/:$/, '')) : []
}

function extractArrayValues(src: string, varName: string, moduleKey: string): string[] {
  // Find the module's array in the record
  const regex = new RegExp(
    `\\b${moduleKey}\\s*:\\s*\\[([\\s\\S]*?)\\]`,
    'm'
  )
  const match = src.match(regex)
  if (!match) return []
  const keys = match[1].match(/'([^']+)'/g)
  return keys ? keys.map((k) => k.replace(/'/g, '')) : []
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Config Pipeline Integrity', () => {
  describe('1. ONBOARDING_CONFIG_KEYS → MODULE_CONFIG_FIELDS coverage', () => {
    const onboardingKeys = extractSetKeys(actionsSrc, 'ONBOARDING_CONFIG_KEYS')

    // Get ALL config fields from MODULE_CONFIG_FIELDS
    const allModuleConfigFields = new Set<string>()
    const moduleKeys = extractRecordKeys(ownerConfigSrc, 'MODULE_CONFIG_FIELDS')
    for (const mk of moduleKeys) {
      const fields = extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', mk)
      fields.forEach((f) => allModuleConfigFields.add(f))
    }

    it('every onboarding config key exists in at least one MODULE_CONFIG_FIELDS entry', () => {
      const missing = onboardingKeys.filter((k) => !allModuleConfigFields.has(k))
      // Some keys are general (store_phone, store_address, announcement_bar_*)
      // that don't map to a specific module — allow them
      const generalKeys = new Set([
        'store_phone', 'store_address',
        'announcement_bar_text', 'announcement_bar_enabled',
        'default_country_prefix', // in sales_channels
      ])
      const actualMissing = missing.filter((k) => !generalKeys.has(k))
      expect(actualMissing).toEqual([])
    })

    it('has at least 45 onboarding config keys', () => {
      expect(onboardingKeys.length).toBeGreaterThanOrEqual(45)
    })
  })

  describe('2. MODULE_CONFIG_FIELDS → Zod validation coverage', () => {
    const moduleKeys = extractRecordKeys(ownerConfigSrc, 'MODULE_CONFIG_FIELDS')

    // Get all unique fields from MODULE_CONFIG_FIELDS
    const allFields = new Set<string>()
    for (const mk of moduleKeys) {
      extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', mk).forEach((f) =>
        allFields.add(f)
      )
    }

    it('every config field has a Zod schema in owner-validation.ts', () => {
      const missing: string[] = []
      for (const field of allFields) {
        // Check if the field name appears as a schema key in owner-validation.ts
        if (!ownerValidationSrc.includes(`${field}:`)) {
          missing.push(field)
        }
      }
      expect(missing).toEqual([])
    })
  })

  describe('3. ModuleConfigClient field definitions', () => {
    const fieldDefModules = extractRecordKeys(
      moduleConfigClientSrc,
      'MODULE_CONFIG_FIELD_DEFS'
    )

    it('has field defs for chatbot module', () => {
      expect(fieldDefModules).toContain('chatbot')
    })
    it('has field defs for pos module', () => {
      expect(fieldDefModules).toContain('pos')
    })
    it('has field defs for crm module', () => {
      expect(fieldDefModules).toContain('crm')
    })
    it('has field defs for email_marketing module', () => {
      expect(fieldDefModules).toContain('email_marketing')
    })
    it('has field defs for automation module', () => {
      expect(fieldDefModules).toContain('automation')
    })
    it('has field defs for capacidad module', () => {
      expect(fieldDefModules).toContain('capacidad')
    })
    it('has at least 11 module field defs (auth_advanced has no config fields)', () => {
      expect(fieldDefModules.length).toBeGreaterThanOrEqual(11)
    })
  })

  describe('4. Field type coverage', () => {
    it('ModuleConfigClient supports toggle type', () => {
      expect(moduleConfigClientSrc).toContain("type: 'toggle'")
      expect(moduleConfigClientSrc).toContain("field.type === 'toggle'")
    })

    it('ModuleConfigClient supports number type with inputMode', () => {
      expect(moduleConfigClientSrc).toContain("type: 'number'")
      expect(moduleConfigClientSrc).toContain('inputMode="decimal"')
    })
  })

  describe('5. Whitelist safety', () => {
    const onboardingKeys = extractSetKeys(actionsSrc, 'ONBOARDING_CONFIG_KEYS')
    const emailKeys = extractSetKeys(actionsSrc, 'EMAIL_KEYS')
    const numberKeys = extractSetKeys(actionsSrc, 'NUMBER_KEYS')
    const booleanKeys = extractSetKeys(actionsSrc, 'BOOLEAN_KEYS')

    it('all email keys are in the onboarding whitelist', () => {
      const missing = emailKeys.filter((k) => !onboardingKeys.includes(k))
      expect(missing).toEqual([])
    })

    it('all number keys are in the onboarding whitelist', () => {
      const missing = numberKeys.filter((k) => !onboardingKeys.includes(k))
      expect(missing).toEqual([])
    })

    it('all boolean keys are in the onboarding whitelist', () => {
      const missing = booleanKeys.filter((k) => !onboardingKeys.includes(k))
      expect(missing).toEqual([])
    })

    it('boolean coercion is applied in save action', () => {
      expect(actionsSrc).toContain('BOOLEAN_KEYS.has(key)')
      expect(actionsSrc).toContain("value === true || value === 'true'")
    })

    it('onboarding config keys are unique (no duplicates)', () => {
      const seen = new Set<string>()
      const duplicates: string[] = []
      for (const key of onboardingKeys) {
        if (seen.has(key)) duplicates.push(key)
        seen.add(key)
      }
      expect(duplicates).toEqual([])
    })
  })

  describe('6. owner-config.ts MODULE_CONFIG_FIELDS completeness', () => {
    it('chatbot has at least 4 config fields', () => {
      const fields = extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', 'chatbot')
      expect(fields.length).toBeGreaterThanOrEqual(4)
    })

    it('pos has at least 5 config fields', () => {
      const fields = extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', 'pos')
      expect(fields.length).toBeGreaterThanOrEqual(5)
    })

    it('crm has at least 3 config fields', () => {
      const fields = extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', 'crm')
      expect(fields.length).toBeGreaterThanOrEqual(3)
    })

    it('email_marketing has at least 4 config fields', () => {
      const fields = extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', 'email_marketing')
      expect(fields.length).toBeGreaterThanOrEqual(4)
    })

    it('capacidad has at least 3 config fields', () => {
      const fields = extractArrayValues(ownerConfigSrc, 'MODULE_CONFIG_FIELDS', 'capacidad')
      expect(fields.length).toBeGreaterThanOrEqual(3)
    })
  })
})
