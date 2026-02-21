'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ChatWidgetProps } from './ChatWidget'

const LazyChatWidget = dynamic(
    () => import('./ChatWidget').then((mod) => mod.ChatWidget),
    { ssr: false }
)

type DeferredChatWidgetProps = Omit<ChatWidgetProps, 'isEnabled'> & {
    enabled: boolean
    delayMs?: number
}

export function DeferredChatWidget({ enabled, delayMs = 1200, ...props }: DeferredChatWidgetProps) {
    const [shouldRender, setShouldRender] = useState(false)

    useEffect(() => {
        if (!enabled) return

        const markReady = () => setShouldRender(true)
        const timer = window.setTimeout(markReady, delayMs)

        window.addEventListener('pointerdown', markReady, { once: true, passive: true })
        window.addEventListener('keydown', markReady, { once: true })

        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('pointerdown', markReady)
            window.removeEventListener('keydown', markReady)
        }
    }, [delayMs, enabled])

    if (!enabled || !shouldRender) {
        return null
    }

    return (
        <div data-testid="deferred-chat-widget">
            <LazyChatWidget {...props} isEnabled={enabled} />
        </div>
    )
}
