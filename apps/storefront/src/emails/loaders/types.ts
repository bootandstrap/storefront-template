import type { ComponentType } from 'react'

export type EmailTemplateLoader = () => Promise<{
    default: ComponentType<object>
}>
