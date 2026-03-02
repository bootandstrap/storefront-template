/**
 * Tests for Panel Access Policy — ensures role consistency across all auth layers
 */
import { describe, it, expect } from 'vitest'
import { PANEL_ALLOWED_ROLES, isPanelRole } from '../panel-access-policy'

describe('Panel Access Policy', () => {
    it('includes owner only', () => {
        expect(PANEL_ALLOWED_ROLES).toContain('owner')
    })

    it('has exactly 1 role', () => {
        expect(PANEL_ALLOWED_ROLES).toHaveLength(1)
    })

    it('isPanelRole returns true for allowed roles', () => {
        expect(isPanelRole('owner')).toBe(true)
    })

    it('isPanelRole returns false for non-panel roles', () => {
        expect(isPanelRole('admin')).toBe(false)
        expect(isPanelRole('customer')).toBe(false)
        expect(isPanelRole('guest')).toBe(false)
        expect(isPanelRole(null)).toBe(false)
        expect(isPanelRole(undefined)).toBe(false)
        expect(isPanelRole('')).toBe(false)
    })
})
