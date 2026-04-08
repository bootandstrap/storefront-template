/**
 * Template Registry
 *
 * Central registry for all industry templates.
 * Import and register new templates here.
 */

import type { IndustryTemplate } from '../types'
import { freshProduceTemplate } from './fresh-produce'
import { fashionTemplate } from './fashion'
import { restaurantTemplate } from './restaurant'
import { techTemplate } from './tech'
import { beautyTemplate } from './beauty'

const TEMPLATES: IndustryTemplate[] = [
    freshProduceTemplate,
    fashionTemplate,
    restaurantTemplate,
    techTemplate,
    beautyTemplate,
]

let _registry: Map<string, IndustryTemplate> | null = null

export function getTemplateRegistry(): Map<string, IndustryTemplate> {
    if (!_registry) {
        _registry = new Map()
        for (const t of TEMPLATES) {
            _registry.set(t.id, t)
        }
    }
    return _registry
}

export function getTemplateIds(): string[] {
    return TEMPLATES.map(t => t.id)
}
