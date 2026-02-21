import { z } from 'zod'

const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1),
})

/**
 * Chat request schema — CLIENT-SAFE fields only.
 * tier and userId are resolved SERVER-SIDE from the auth session.
 * They are NOT accepted from the client to prevent privilege escalation.
 */
const chatRequestSchema = z.object({
    message: z.string().min(1),
    history: z.array(chatMessageSchema).default([]),
    locale: z.string().default('es'),
})

export type ParsedChatRequest = z.infer<typeof chatRequestSchema>

export function parseChatRequest(input: unknown): ParsedChatRequest {
    return chatRequestSchema.parse(input)
}
