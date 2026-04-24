/**
 * Dynamic module tab loader — centralizes dynamic imports for the modules hub.
 *
 * Reduces fan-out on modulos/page.tsx by encapsulating all module page
 * dynamic imports in a single file.
 *
 * Zone: 🟡 EXTEND — add new module tabs here
 */

import type { ComponentType } from 'react'

type ModulePageProps = { params: Promise<{ lang: string }> }

const MODULE_TAB_LOADERS: Record<string, () => Promise<{ default: ComponentType<ModulePageProps> }>> = {
    chatbot: () => import('../chatbot/page'),
    crm: () => import('../crm/page'),
    seo: () => import('../seo/page'),
    'redes-sociales': () => import('../redes-sociales/page'),
    mensajes: () => import('../mensajes/page'),
    automatizaciones: () => import('../automatizaciones/page'),
    canales: () => import('../canales/page'),
    capacidad: () => import('../capacidad/page'),
    auth: () => import('../auth/page'),
}

/**
 * Dynamically load a module tab's page component.
 * Returns null if the tab key is unknown.
 */
export async function loadModuleTab(
    tabKey: string,
): Promise<ComponentType<ModulePageProps> | null> {
    const loader = MODULE_TAB_LOADERS[tabKey]
    if (!loader) return null
    const mod = await loader()
    return mod.default
}
