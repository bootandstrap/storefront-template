'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import {
    CHAT_TIERS,
    CHAT_ANONYMOUS_KEY,
    CHAT_MESSAGES,
    type ChatTier,
} from '@/lib/chat/client-config'
import ChatQuickActions from './ChatQuickActions'
import ChatSuggestedPrompts from './ChatSuggestedPrompts'

// ── Types ──────────────────────────────────────────────────
interface Message {
    role: 'user' | 'assistant'
    content: string
}

export interface ChatWidgetProps {
    locale?: string
    tier?: ChatTier
    userId?: string
    isEnabled?: boolean
    businessName?: string
    planMessageLimit?: number | null
    /** Owner config — chatbot_name */
    chatbotName?: string
    /** Owner config — chatbot_welcome_message */
    chatbotWelcomeMessage?: string
    /** Owner config — chatbot_auto_open_delay (seconds) */
    autoOpenDelay?: number
}

// ── Component ──────────────────────────────────────────────
export function ChatWidget({
    locale = 'es',
    tier = 'visitor',
    userId,
    isEnabled = true,
    businessName = '',
    planMessageLimit,
    chatbotName,
    chatbotWelcomeMessage,
    autoOpenDelay,
}: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [messageCount, setMessageCount] = useState(0)
    const [welcomeMessage, setWelcomeMessage] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const tierConfig = CHAT_TIERS[tier]
    const lang = locale // For route navigation

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Load message count + welcome message
    useEffect(() => {
        if (tier === 'visitor') {
            const stored = localStorage.getItem(CHAT_ANONYMOUS_KEY)
            if (stored) setMessageCount(parseInt(stored) || 0)
        }

        // Use owner-configured welcome message if available, else fetch from chat_settings
        if (chatbotWelcomeMessage) {
            setWelcomeMessage(chatbotWelcomeMessage)
        } else {
            fetch('/api/chat/settings')
                .then(res => res.json())
                .then(data => {
                    const key = `welcome_message_${locale}`
                    if (data.settings?.[key]) {
                        setWelcomeMessage(data.settings[key])
                    }
                })
                .catch(() => { })
        }

        // Fetch authenticated user's usage count
        if (tier !== 'visitor') {
            fetch('/api/chat/usage')
                .then(res => res.json())
                .then(data => setMessageCount(data.messageCount || 0))
                .catch(() => { })
        }

        // Restore local history for customer tier
        if (tier === 'customer') {
            try {
                const stored = localStorage.getItem('tenant_chat_history')
                if (stored) {
                    const parsed = JSON.parse(stored)
                    if (Array.isArray(parsed)) setMessages(parsed.slice(-20))
                }
            } catch { /* ignore */ }
        }
    }, [tier, locale, chatbotWelcomeMessage])

    // Auto-open after owner-configured delay
    useEffect(() => {
        if (autoOpenDelay && autoOpenDelay > 0 && !isOpen) {
            const timer = setTimeout(() => setIsOpen(true), autoOpenDelay * 1000)
            return () => clearTimeout(timer)
        }
    }, [autoOpenDelay]) // eslint-disable-line react-hooks/exhaustive-deps

    // Persist local chat history for customer tier
    useEffect(() => {
        if (tier === 'customer' && messages.length > 0) {
            localStorage.setItem('tenant_chat_history', JSON.stringify(messages.slice(-20)))
        }
    }, [messages, tier])

    const incrementMessageCount = useCallback(() => {
        setMessageCount(prev => {
            const next = prev + 1
            if (tier === 'visitor') {
                localStorage.setItem(CHAT_ANONYMOUS_KEY, String(next))
            }
            return next
        })
    }, [tier])

    const getLimit = useCallback(() => {
        if (tier === 'premium') {
            return planMessageLimit ?? 1000
        }
        return tierConfig.messageLimit ?? 10
    }, [tier, planMessageLimit, tierConfig.messageLimit])

    const isLimitReached = messageCount >= getLimit()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading || isLimitReached) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.slice(-8),
                    locale,
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to get response')
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
            incrementMessageCount()

        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: locale === 'es'
                    ? 'Lo siento, ocurrió un error. Intenta de nuevo.'
                    : 'Sorry, an error occurred. Please try again.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    /** Inject a prompt from quick actions or suggestions */
    const handlePromptInjection = (prompt: string) => {
        setInput(prompt)
        // Auto-submit for quick actions
        const syntheticEvent = { preventDefault: () => { } } as React.FormEvent
        // Set input then submit on next tick
        setTimeout(() => {
            const form = document.querySelector('[data-chat-form]') as HTMLFormElement | null
            form?.requestSubmit()
        }, 50)
    }

    if (!isEnabled) return null

    const labels = {
        es: { placeholder: 'Escribe tu pregunta...', title: 'Asistente Virtual', powered: 'BootandStrap AI' },
        en: { placeholder: 'Type your question...', title: 'Virtual Assistant', powered: 'BootandStrap AI' },
        de: { placeholder: 'Stelle deine Frage...', title: 'Virtueller Assistent', powered: 'BootandStrap AI' },
        fr: { placeholder: 'Posez votre question...', title: 'Assistant Virtuel', powered: 'BootandStrap AI' },
        it: { placeholder: 'Scrivi la tua domanda...', title: 'Assistente Virtuale', powered: 'BootandStrap AI' },
    }
    const l = labels[locale as keyof typeof labels] || labels.es

    // ── Tier-Based Visuals ──────────────────────────────────
    const tierBadge = tierConfig.badge === 'pro'
        ? <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold tracking-wide">⚡ PRO</span>
        : tierConfig.badge === 'verified'
            ? <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white/90 font-medium">✓</span>
            : null

    const windowWidth = tierConfig.windowSize === 'full' ? 'w-[420px]' : 'w-[360px]'

    const headerStyle = tier === 'premium'
        ? {
            background: `linear-gradient(135deg, var(--config-primary, #6366f1), var(--config-secondary, #8b5cf6))`,
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
        }
        : { backgroundColor: 'var(--config-primary, #6366f1)' }

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                            ${tier === 'premium' ? 'ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : ''}`}
                        style={{ backgroundColor: 'var(--config-primary, #6366f1)' }}
                        aria-label={l.title}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {tier === 'premium' && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[8px] font-bold text-amber-900">⚡</span>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed bottom-6 right-6 z-50 ${windowWidth} max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-200 ${tierConfig.accentClass}`}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-4 py-3 text-white"
                            style={headerStyle}
                        >
                            <div>
                                <h3 className="font-semibold text-sm flex items-center">
                                    {chatbotName || l.title}
                                    {tierBadge}
                                </h3>
                                {businessName && (
                                    <p className="text-xs opacity-80">{businessName}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                                aria-label="Close chat"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {/* Welcome + Quick Actions + Suggestions */}
                            {messages.length === 0 && (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        <div
                                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                                            style={{ backgroundColor: 'var(--config-primary, #6366f1)', opacity: 0.1 }}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--config-primary, #6366f1)" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {welcomeMessage || (locale === 'es'
                                                ? '¡Hola! ¿En qué puedo ayudarte?'
                                                : 'Hello! How can I help you?')}
                                        </p>
                                    </div>

                                    {/* Quick Actions */}
                                    <ChatQuickActions
                                        tier={tier}
                                        locale={locale}
                                        lang={lang}
                                        onPrompt={handlePromptInjection}
                                    />

                                    {/* Suggested Prompts */}
                                    <ChatSuggestedPrompts
                                        tier={tier}
                                        locale={locale}
                                        onPrompt={handlePromptInjection}
                                        businessName={businessName}
                                    />
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'text-white rounded-br-md'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                            }`}
                                        style={msg.role === 'user' ? { backgroundColor: 'var(--config-primary, #6366f1)' } : undefined}
                                    >
                                        {msg.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        ) : msg.content}
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Limit warning */}
                        {isLimitReached && (
                            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs text-center">
                                {tier === 'visitor'
                                    ? (CHAT_MESSAGES.loginRequired[locale as keyof typeof CHAT_MESSAGES.loginRequired] || CHAT_MESSAGES.loginRequired.es)
                                    : (CHAT_MESSAGES.upgradeRequired[locale as keyof typeof CHAT_MESSAGES.upgradeRequired] || CHAT_MESSAGES.upgradeRequired.es)
                                }
                            </div>
                        )}

                        {/* Input */}
                        <form
                            data-chat-form
                            onSubmit={handleSubmit}
                            className="px-3 py-3 border-t border-gray-200 flex gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={l.placeholder}
                                disabled={isLoading || isLimitReached}
                                className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-[var(--config-primary,#6366f1)] disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim() || isLimitReached}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: 'var(--config-primary, #6366f1)' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m22 2-7 20-4-9-9-4 20-7z" />
                                </svg>
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="px-3 pb-2 text-center">
                            <span className="text-[10px] text-gray-400">{l.powered}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default ChatWidget
