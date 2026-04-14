/**
 * Shared types for email layouts
 *
 * All layouts must accept these props so templates can be rendered
 * with any layout interchangeably.
 *
 * Zone: 🟢 GREEN — BootandStrap-provided types
 */

import type * as React from 'react'

export interface LayoutProps {
    preview?: string
    storeName?: string
    storeUrl?: string
    logoUrl?: string
    brandColor?: string
    children: React.ReactNode
}

/** Design slug → layout component type */
export type LayoutComponent = React.ComponentType<LayoutProps>
