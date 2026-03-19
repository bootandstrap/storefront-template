import { describe, expect, it, vi } from 'vitest'
import {
    isChecklistSkipped,
    PANEL_CHECKLIST_SKIPPED_KEY,
} from '../PanelChecklist'

describe('panel-checklist storage contract', () => {
    it('reads skipped state from storage', () => {
        const storage = {
            getItem: vi.fn((key: string) => key === PANEL_CHECKLIST_SKIPPED_KEY ? '1' : null),
        }

        expect(isChecklistSkipped(storage)).toBe(true)
    })

    it('returns false when not skipped', () => {
        const storage = {
            getItem: vi.fn(() => null),
        }

        expect(isChecklistSkipped(storage)).toBe(false)
    })

    it('returns false when storage is null', () => {
        expect(isChecklistSkipped(null)).toBe(false)
    })
})
