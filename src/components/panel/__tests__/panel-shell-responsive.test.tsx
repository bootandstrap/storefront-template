import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PanelTopbar from '../PanelTopbar'

describe('panel-shell-responsive', () => {
    it('renders a mobile-only topbar with menu button', () => {
        const html = renderToStaticMarkup(
            <PanelTopbar
                businessName="Mi Negocio"
                ownerPanelLabel="Panel Owner"
                onMenuClick={() => {}}
            />
        )

        expect(html).toContain('md:hidden')
        expect(html).toContain('Open panel menu')
        expect(html).toContain('Mi Negocio')
        expect(html).toContain('Panel Owner')
    })
})

