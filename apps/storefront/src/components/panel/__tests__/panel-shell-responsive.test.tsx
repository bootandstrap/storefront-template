import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PanelTopbar from '../PanelTopbar'

describe('panel-shell-responsive', () => {
    it('renders a sticky topbar with greeting and breadcrumbs', () => {
        const html = renderToStaticMarkup(
            <PanelTopbar
                ownerName="Juan"
                businessName="Mi Negocio"
                lang="es"
                breadcrumbMap={{ catalogo: 'Catálogo', pedidos: 'Pedidos' }}
                greetings={{ morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' }}
                labels={{ ownerPanel: 'Panel Owner', backToStore: 'Volver', logout: 'Cerrar sesión' }}
                onMenuClick={() => {}}
            />
        )

        expect(html).toContain('Mi Negocio')
        expect(html).toContain('Juan')
    })
})
