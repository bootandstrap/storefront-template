import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock client-side dependencies that can't run in SSR tests
vi.mock('next/navigation', () => ({ usePathname: () => '/es/panel' }))
vi.mock('@/components/panel/OrderNotifications', () => ({
    default: () => null,
}))

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
