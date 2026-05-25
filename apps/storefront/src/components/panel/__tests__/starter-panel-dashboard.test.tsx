import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}))

import StarterPanelDashboard from '../starter/StarterPanelDashboard'

describe('starter-panel-dashboard', () => {
    it('renders the starter project view instead of a business dashboard shell', () => {
        const html = renderToStaticMarkup(
            <StarterPanelDashboard
                lang="es"
                customerName="Demo Fullcommerce"
                supportEmail="support@example.com"
                project={{
                    tenantId: 'tenant-1',
                    currentPhaseKey: 'kickoff',
                    phases: [
                        {
                            id: 'phase-1',
                            phase_key: 'kickoff',
                            title: 'Kickoff',
                            description: 'Arranque y recogida inicial.',
                            phase_type: 'input_required',
                            phase_status: 'in_progress',
                            sort_order: 1,
                            visible_features: ['timeline', 'asset_upload_center'],
                        },
                    ],
                    requestsByPhase: {
                        kickoff: [
                            {
                                id: 'request-1',
                                request_key: 'kickoff_ack',
                                title: 'Confirma el arranque',
                                description: 'Necesitamos tu confirmacion.',
                                request_type: 'acknowledgement',
                                request_status: 'pending',
                                is_required: true,
                                sort_order: 1,
                                validation_rules: {},
                                asset_requirements: {},
                                response_payload: {},
                                config: {},
                            },
                        ],
                    },
                }}
            />
        )

        expect(html).toContain('Starter colaborativo')
        expect(html).toContain('Tu tienda se esta preparando')
        expect(html).toContain('Confirma el arranque')
        expect(html).toContain('Kickoff')
    })
})
