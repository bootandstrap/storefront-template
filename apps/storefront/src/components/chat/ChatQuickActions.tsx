'use client'

import { QUICK_ACTION_DEFS, CHAT_TIERS, type ChatTier } from '@/lib/chat/client-config'

interface ChatQuickActionsProps {
    tier: ChatTier
    locale: string
    lang: string
    onPrompt: (prompt: string) => void
}

export default function ChatQuickActions({ tier, locale, lang, onPrompt }: ChatQuickActionsProps) {
    const tierConfig = CHAT_TIERS[tier]
    const actions = tierConfig.quickActions

    return (
        <div className="flex flex-wrap gap-1.5 px-1">
            {actions.map(key => {
                const def = QUICK_ACTION_DEFS[key]
                if (!def) return null

                const label = def.labels[locale] || def.labels.es
                const handleClick = () => {
                    if (def.prompt) {
                        const prompt = def.prompt[locale] || def.prompt.es
                        onPrompt(prompt)
                    } else if (def.route) {
                        window.location.href = `/${lang}${def.route}`
                    }
                }

                return (
                    <button
                        key={key}
                        onClick={handleClick}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full
                                   bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all
                                   hover:shadow-sm active:scale-95"
                    >
                        <span>{def.icon}</span>
                        <span>{label}</span>
                    </button>
                )
            })}
        </div>
    )
}
