import { describe, expect, it, vi } from 'vitest'
import {
    isChecklistSkipped,
    markChecklistSkipped,
    PANEL_CHECKLIST_SKIPPED_KEY,
} from '../PanelChecklist'

describe('panel-checklist storage contract', () => {
    it('reads skipped state from storage', () => {
        const storage = {
            getItem: vi.fn((key: string) => key === PANEL_CHECKLIST_SKIPPED_KEY ? '1' : null),
        }

        expect(isChecklistSkipped(storage)).toBe(true)
    })

    it('writes skipped state to storage', () => {
        const setItem = vi.fn()
        markChecklistSkipped({ setItem })
        expect(setItem).toHaveBeenCalledWith(PANEL_CHECKLIST_SKIPPED_KEY, '1')
    })
})
