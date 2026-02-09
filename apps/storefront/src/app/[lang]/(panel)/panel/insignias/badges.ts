/**
 * Badge definitions shared between server actions and client components
 */

export const AVAILABLE_BADGES = [
    { id: 'featured', emoji: '⭐', label: 'Featured', color: 'bg-amber-100 text-amber-700' },
    { id: 'new', emoji: '🆕', label: 'New', color: 'bg-blue-100 text-blue-700' },
    { id: 'sale', emoji: '🏷️', label: 'Sale', color: 'bg-red-100 text-red-700' },
    { id: 'popular', emoji: '🔥', label: 'Popular', color: 'bg-orange-100 text-orange-700' },
    { id: 'eco', emoji: '🌿', label: 'Eco', color: 'bg-green-100 text-green-700' },
    { id: 'limited', emoji: '⏰', label: 'Limited', color: 'bg-purple-100 text-purple-700' },
] as const

export type BadgeId = (typeof AVAILABLE_BADGES)[number]['id']
