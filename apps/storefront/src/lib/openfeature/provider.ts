/**
 * BootandStrap OpenFeature Provider
 *
 * Implements the OpenFeature Provider interface using the existing
 * governance config (`getConfig()`) as the backing data source.
 *
 * This creates a standard, vendor-neutral API for flag evaluation:
 *
 *   const client = OpenFeature.getClient()
 *   const enabled = await client.getBooleanValue('enable_chatbot', false)
 *   const limit = await client.getNumberValue('max_products', 100)
 *
 * Benefits:
 * - Industry-standard API (CNCF project)
 * - Decoupled from governance internals
 * - Swappable: can later plug in LaunchDarkly, Unleash, etc. without changing consumers
 * - Type-safe with built-in default values
 *
 * Data flow:
 *   Stripe Entitlements → webhook → feature_flags/plan_limits → getConfig() → this provider
 *
 * @see https://openfeature.dev/docs/reference/concepts/provider
 */

import type {
  Provider,
  JsonValue,
  ResolutionDetails,
  EvaluationContext,
  ProviderMetadata,
} from '@openfeature/server-sdk'

import { getConfig } from '@/lib/config'

export class BootandStrapProvider implements Provider {
  readonly metadata: ProviderMetadata = {
    name: 'bootandstrap-governance',
  }

  /**
   * Resolve a boolean flag (feature toggle).
   * Maps to feature_flags in Supabase, synced by Stripe Entitlements webhook.
   */
  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    _context: EvaluationContext,
  ): Promise<ResolutionDetails<boolean>> {
    try {
      const { featureFlags } = await getConfig()
      const value = featureFlags[flagKey as keyof typeof featureFlags]

      if (typeof value === 'boolean') {
        return {
          value,
          reason: 'TARGETING_MATCH',
          variant: value ? 'enabled' : 'disabled',
        }
      }

      // Flag not found in governance config
      return {
        value: defaultValue,
        reason: 'DEFAULT',
        variant: 'default',
      }
    } catch {
      return {
        value: defaultValue,
        reason: 'ERROR',
        errorCode: 'GENERAL',
        errorMessage: 'Failed to fetch governance config',
      }
    }
  }

  /**
   * Resolve a numeric value (plan limit).
   * Maps to plan_limits in Supabase.
   */
  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    _context: EvaluationContext,
  ): Promise<ResolutionDetails<number>> {
    try {
      const { planLimits } = await getConfig()
      const value = planLimits[flagKey as keyof typeof planLimits]

      if (typeof value === 'number') {
        return {
          value,
          reason: 'TARGETING_MATCH',
        }
      }

      return {
        value: defaultValue,
        reason: 'DEFAULT',
      }
    } catch {
      return {
        value: defaultValue,
        reason: 'ERROR',
        errorCode: 'GENERAL',
        errorMessage: 'Failed to fetch governance config',
      }
    }
  }

  /**
   * Resolve a string value.
   * Currently maps to store config string fields.
   */
  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    _context: EvaluationContext,
  ): Promise<ResolutionDetails<string>> {
    try {
      const { config } = await getConfig()
      const value = config[flagKey as keyof typeof config]

      if (typeof value === 'string') {
        return {
          value,
          reason: 'TARGETING_MATCH',
        }
      }

      return {
        value: defaultValue,
        reason: 'DEFAULT',
      }
    } catch {
      return {
        value: defaultValue,
        reason: 'ERROR',
        errorCode: 'GENERAL',
      }
    }
  }

  /**
   * Resolve a structured (object) value.
   * Returns plan_limits as a whole object when requested.
   */
  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    _context: EvaluationContext,
  ): Promise<ResolutionDetails<T>> {
    try {
      const { planLimits, featureFlags } = await getConfig()

      if (flagKey === 'plan_limits') {
        return {
          value: planLimits as unknown as T,
          reason: 'TARGETING_MATCH',
        }
      }

      if (flagKey === 'feature_flags') {
        return {
          value: featureFlags as unknown as T,
          reason: 'TARGETING_MATCH',
        }
      }

      return {
        value: defaultValue,
        reason: 'DEFAULT',
      }
    } catch {
      return {
        value: defaultValue,
        reason: 'ERROR',
        errorCode: 'GENERAL',
      }
    }
  }
}
