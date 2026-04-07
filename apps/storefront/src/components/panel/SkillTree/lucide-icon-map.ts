/**
 * lucide-icon-map.ts — Maps icon_name strings to Lucide React components
 *
 * Used by ModuleNode to render professional icons instead of emojis.
 * Falls back to Package icon for unknown names.
 */

import {
    ShoppingBag,
    MessageCircle,
    Bot,
    Users,
    Search,
    Share2,
    Globe,
    Zap,
    Shield,
    Mail,
    Monitor,
    Tablet,
    BarChart3,
    Package,
    type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
    ShoppingBag,
    MessageCircle,
    Bot,
    Users,
    Search,
    Share2,
    Globe,
    Zap,
    Shield,
    Mail,
    Monitor,
    Tablet,
    BarChart3,
    Package,
}

export function getModuleIcon(iconName: string): LucideIcon {
    return ICON_MAP[iconName] || Package
}
