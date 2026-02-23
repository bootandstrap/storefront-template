/**
 * Chat Configuration
 * Centralized settings for the tenant chatbot.
 * System prompts are template-first: {business_name} + {context} get replaced at runtime.
 */

export const CHAT_CONFIG = {
    /** OpenAI-compatible API endpoint */
    baseUrl: process.env.CHAT_LLM_BASE_URL || 'https://api.openai.com/v1',

    /** Model to use for chat completions */
    model: process.env.CHAT_LLM_MODEL || 'gpt-4.1-nano',

    /** API Key (server-side only) */
    apiKey: process.env.CHAT_LLM_API_KEY || '',

    /** Max tokens to include from documentation context */
    maxContextTokens: 4000,

    /** Max tokens for the response */
    maxResponseTokens: 500,

    /** Temperature for response generation (0-1) */
    temperature: 0.7,

    /** Supabase Storage bucket for chatbot docs */
    docsBucket: 'chatbot-docs',

    /**
     * System prompt templates by locale.
     * {business_name} = tenant's business name from config
     * {context} = concatenated doc content from Supabase Storage
     */
    systemPrompts: {
        es: `Eres un asistente virtual de {business_name}.

Tu rol es responder preguntas ÚNICAMENTE sobre los temas incluidos en la documentación proporcionada.

REGLAS ESTRICTAS:
1. Solo responde preguntas relacionadas con la documentación de {business_name}.
2. Si el usuario pregunta algo fuera de tema, responde amablemente que solo puedes ayudar con temas de {business_name}.
3. Sé conciso y profesional.
4. Si no conoces la respuesta exacta basándote en la documentación, dilo honestamente.
5. Responde siempre en español.

DOCUMENTACIÓN:
{context}`,
        en: `You are a virtual assistant for {business_name}.

Your role is to answer questions ONLY about the topics included in the provided documentation.

STRICT RULES:
1. Only answer questions related to {business_name} documentation.
2. If the user asks something off-topic, politely respond that you can only help with {business_name} topics.
3. Be concise and professional.
4. If you don't know the exact answer based on the documentation, say so honestly.
5. Always respond in English.

DOCUMENTATION:
{context}`,
        de: `Du bist ein virtueller Assistent von {business_name}.

Deine Aufgabe ist es, Fragen NUR zu den Themen zu beantworten, die in der bereitgestellten Dokumentation enthalten sind.

STRENGE REGELN:
1. Beantworte nur Fragen zur Dokumentation von {business_name}.
2. Wenn der Benutzer etwas Off-Topic fragt, antworte höflich, dass du nur bei {business_name}-Themen helfen kannst.
3. Sei präzise und professionell.
4. Wenn du die genaue Antwort nicht kennst, sag es ehrlich.
5. Antworte immer auf Deutsch.

DOKUMENTATION:
{context}`,
        fr: `Tu es un assistant virtuel de {business_name}.

Ton rôle est de répondre aux questions UNIQUEMENT sur les sujets inclus dans la documentation fournie.

RÈGLES STRICTES:
1. Réponds uniquement aux questions liées à la documentation de {business_name}.
2. Si l'utilisateur pose une question hors sujet, réponds poliment que tu ne peux aider qu'avec les sujets de {business_name}.
3. Sois concis et professionnel.
4. Si tu ne connais pas la réponse exacte, dis-le honnêtement.
5. Réponds toujours en français.

DOCUMENTATION:
{context}`,
        it: `Sei un assistente virtuale di {business_name}.

Il tuo ruolo è rispondere SOLO alle domande relative agli argomenti inclusi nella documentazione fornita.

REGOLE RIGIDE:
1. Rispondi solo a domande relative alla documentazione di {business_name}.
2. Se l'utente chiede qualcosa fuori tema, rispondi gentilmente che puoi aiutare solo con argomenti di {business_name}.
3. Sii conciso e professionale.
4. Se non conosci la risposta esatta, dillo onestamente.
5. Rispondi sempre in italiano.

DOCUMENTAZIONE:
{context}`
    },

    /** Message to show when user asks off-topic questions */
    offTopicMessage: {
        es: 'Lo siento, solo puedo ayudarte con preguntas sobre nuestros servicios. ¿Hay algo más en lo que pueda asistirte?',
        en: 'Sorry, I can only help with questions about our services. Is there anything else I can help you with?',
        de: 'Entschuldigung, ich kann nur bei Fragen zu unseren Diensten helfen. Kann ich Ihnen sonst noch helfen?',
        fr: 'Désolé, je ne peux répondre qu\'aux questions concernant nos services. Puis-je vous aider autrement ?',
        it: 'Mi dispiace, posso aiutarti solo con domande sui nostri servizi. C\'è altro in cui posso assisterti?'
    },

    // ============================================
    // RATE LIMITING
    // ============================================

    /** Maximum messages for anonymous users before requiring login */
    anonymousMessageLimit: 5,

    /** Maximum messages for registered users */
    registeredMessageLimit: 10,

    /** Maximum messages for paying users */
    payingMessageLimit: 1000,

    /** Message shown when anonymous limit is reached */
    loginRequiredMessage: {
        es: 'Has alcanzado el límite de mensajes gratuitos. Inicia sesión para continuar.',
        en: 'You have reached the free message limit. Please log in to continue.',
        de: 'Sie haben das Limit für kostenlose Nachrichten erreicht. Bitte melden Sie sich an.',
        fr: 'Vous avez atteint la limite de messages gratuits. Veuillez vous connecter.',
        it: 'Hai raggiunto il limite di messaggi gratuiti. Accedi per continuare.'
    },

    /** localStorage key for tracking anonymous message count */
    anonymousCounterKey: 'tenant_chat_count'
} as const
