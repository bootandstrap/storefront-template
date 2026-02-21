'use client'

import type { ChatTier } from '@/lib/chat/client-config'
import { CHAT_TIERS } from '@/lib/chat/client-config'

interface ChatSuggestedPromptsProps {
    tier: ChatTier
    locale: string
    onPrompt: (prompt: string) => void
    businessName: string
}

/** Contextual suggested prompts, shown when the chat is empty */
const SUGGESTED_PROMPTS: Record<string, string[]> = {
    es: [
        '¿Qué productos tenéis disponibles?',
        '¿Cómo puedo hacer un pedido?',
        '¿Cuáles son los métodos de pago?',
        '¿Hacéis envíos a toda España?',
        '¿Cuál es la política de devoluciones?',
        '¿Tenéis descuentos o promociones activas?',
        '¿Cuánto tarda el envío?',
        '¿Puedo rastrear mi pedido?',
    ],
    en: [
        'What products do you have available?',
        'How can I place an order?',
        'What payment methods do you accept?',
        'Do you ship internationally?',
        'What is your return policy?',
        'Are there any active promotions?',
        'How long does shipping take?',
        'Can I track my order?',
    ],
    de: [
        'Welche Produkte sind verfügbar?',
        'Wie kann ich bestellen?',
        'Welche Zahlungsmethoden gibt es?',
        'Liefern Sie international?',
        'Wie ist Ihre Rückgaberichtlinie?',
        'Gibt es aktive Angebote?',
        'Wie lange dauert der Versand?',
        'Kann ich meine Bestellung verfolgen?',
    ],
    fr: [
        'Quels produits avez-vous ?',
        'Comment passer commande ?',
        'Quels modes de paiement acceptez-vous ?',
        'Livrez-vous à l\'international ?',
        'Quelle est votre politique de retour ?',
        'Y a-t-il des promotions en cours ?',
        'Combien de temps dure la livraison ?',
        'Puis-je suivre ma commande ?',
    ],
    it: [
        'Quali prodotti avete disponibili?',
        'Come posso effettuare un ordine?',
        'Quali metodi di pagamento accettate?',
        'Spedite a livello internazionale?',
        'Qual è la vostra politica di reso?',
        'Ci sono promozioni attive?',
        'Quanto tempo ci vuole per la spedizione?',
        'Posso tracciare il mio ordine?',
    ],
}

export default function ChatSuggestedPrompts({
    tier,
    locale,
    onPrompt,
    businessName,
}: ChatSuggestedPromptsProps) {
    const tierConfig = CHAT_TIERS[tier]
    const prompts = (SUGGESTED_PROMPTS[locale] || SUGGESTED_PROMPTS.es)
        .slice(0, tierConfig.suggestedPrompts)

    return (
        <div className="space-y-1.5 px-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                {locale === 'es' ? 'Sugerencias' :
                    locale === 'en' ? 'Suggestions' :
                        locale === 'de' ? 'Vorschläge' :
                            locale === 'fr' ? 'Suggestions' : 'Suggerimenti'}
            </p>
            <div className="flex flex-col gap-1">
                {prompts.map((prompt, i) => (
                    <button
                        key={i}
                        onClick={() => onPrompt(prompt)}
                        className="text-left text-xs px-3 py-2 rounded-lg
                                   bg-gradient-to-r from-gray-50 to-gray-100
                                   hover:from-indigo-50 hover:to-purple-50
                                   text-gray-600 hover:text-gray-800
                                   transition-all duration-200
                                   border border-transparent hover:border-indigo-200"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    )
}
