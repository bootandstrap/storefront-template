import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const STOREFRONT_SRC = join(process.cwd(), 'src')

describe('panel owner experience contract', () => {
    it('keeps owner experience mode outside panel feature flags', () => {
        const panelPolicy = readFileSync(join(STOREFRONT_SRC, 'lib/panel-policy.ts'), 'utf8')

        expect(panelPolicy).toContain('ownerExperienceMode?: OwnerExperienceMode | null')
        expect(panelPolicy).toContain("if (ownerExperienceMode === 'starter_collaborative')")
        expect(panelPolicy).not.toContain('starter_collaborative?: boolean')
    })

    it('passes owner experience mode explicitly from the panel layout to panel consumers', () => {
        const panelLayout = readFileSync(join(STOREFRONT_SRC, 'app/[lang]/(panel)/layout.tsx'), 'utf8')
        const panelShell = readFileSync(join(STOREFRONT_SRC, 'components/panel/PanelShell.tsx'), 'utf8')

        expect(panelLayout).toContain('ownerExperienceMode,')
        expect(panelLayout).toContain('ownerExperienceMode={ownerExperienceMode}')
        expect(panelShell).toContain('ownerExperienceMode?: OwnerExperienceMode')
        expect(panelShell).toContain("const isStarterCollaborative = ownerExperienceMode === 'starter_collaborative'")
        expect(panelShell).not.toContain('featureFlags.starter_collaborative')
    })
})
