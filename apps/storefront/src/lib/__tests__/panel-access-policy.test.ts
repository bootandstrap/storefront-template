/**
 * Tests for Panel Access Policy — ensures role consistency across all auth layers
 */
import { describe, it, expect } from 'vitest'
import { PANEL_ALLOWED_ROLES, isPanelRole } from '../panel-access-policy'

describe('Panel Access Policy', () => {
    it('includes owner, admin, and super_admin', () => {
        expect(PANEL_ALLOWED_ROLES).toContain('owner')
        expect(PANEL_ALLOWED_ROLES).toContain('admin')
        expect(PANEL_ALLOWED_ROLES).toContain('super_admin')
    })

    it('has exactly 3 roles', () => {
        expect(PANEL_ALLOWED_ROLES).toHaveLength(3)
    })

    it('isPanelRole returns true for allowed roles', () => {
        expect(isPanelRole('owner')).toBe(true)
        expect(isPanelRole('admin')).toBe(true)
        expect(isPanelRole('super_admin')).toBe(true)
    })

    it('isPanelRole returns false for non-panel roles', () => {
        expect(isPanelRole('customer')).toBe(false)
        expect(isPanelRole('guest')).toBe(false)
        expect(isPanelRole(null)).toBe(false)
        expect(isPanelRole(undefined)).toBe(false)
        expect(isPanelRole('')).toBe(false)
    })
})
