import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FeatureGate from '../FeatureGate'

describe('feature-gate links', () => {
    it('keeps continuity from module info to in-panel activation', async () => {
        const view = await FeatureGate({ flag: 'enable_chatbot', lang: 'es' })
        const html = renderToStaticMarkup(view)

        expect(html).toContain('https://bootandstrap.com/es/modulos/chatbot-ia')
        expect(html).toContain('/es/panel/suscripcion?module=chatbot')
    })
})
