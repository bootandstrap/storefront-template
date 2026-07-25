import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()
const mockGetDictionary = vi.fn()
const mockCreateTranslator = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: mockCreateClient,
}))

vi.mock('@/lib/i18n', () => ({
    getDictionary: mockGetDictionary,
    createTranslator: mockCreateTranslator,
}))

vi.mock('@/components/account/AvatarUpload', () => ({
    default: function AvatarUpload(props: Record<string, unknown>) {
        return { type: 'AvatarUpload', props }
    },
}))

vi.mock('../ProfileForm', () => ({
    default: function ProfileForm(props: Record<string, unknown>) {
        return { type: 'ProfileForm', props }
    },
}))

vi.mock('@/components/account/ChangePasswordForm', () => ({
    default: function ChangePasswordForm() {
        return { type: 'ChangePasswordForm' }
    },
}))

vi.mock('@/components/account/DeleteAccountSection', () => ({
    default: function DeleteAccountSection() {
        return { type: 'DeleteAccountSection' }
    },
}))

function makeProfileClient(options: {
    user?: { id: string; email?: string; created_at?: string } | null
    profile?: { full_name?: string | null; phone?: string | null; avatar_url?: string | null } | null
}) {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: options.user ?? null } })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(async () => ({ data: options.profile ?? null })),
                })),
            })),
        })),
    }
}

describe('ProfilePage /[lang]/cuenta/perfil', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetDictionary.mockResolvedValue({})
        mockCreateTranslator.mockReturnValue((key: string) => key)
    })

    it('renders no profile UI for anonymous users', async () => {
        mockCreateClient.mockResolvedValue(makeProfileClient({ user: null }))
        const { default: ProfilePage } = await import('../page')

        const element = await ProfilePage({ params: Promise.resolve({ lang: 'es' }) })

        expect(element).toBeNull()
    })

    it('passes tenant profile data into visible account components', async () => {
        mockCreateClient.mockResolvedValue(makeProfileClient({
            user: {
                id: 'user_1',
                email: 'buyer@example.com',
                created_at: '2026-07-25T00:00:00Z',
            },
            profile: {
                full_name: 'Buyer Name',
                phone: '+34000000000',
                avatar_url: 'https://cdn.example.com/avatar.png',
            },
        }))
        const { default: ProfilePage } = await import('../page')

        const element = await ProfilePage({ params: Promise.resolve({ lang: 'es' }) })
        const children = element?.props?.children as Array<{ props: Record<string, unknown> }>
        const avatar = children[1]
        const form = children[2]

        expect(mockGetDictionary).toHaveBeenCalledWith('es')
        expect(avatar.props).toMatchObject({
            userId: 'user_1',
            currentAvatarUrl: 'https://cdn.example.com/avatar.png',
            userName: 'Buyer Name',
            userEmail: 'buyer@example.com',
        })
        expect(form.props).toMatchObject({
            profile: { full_name: 'Buyer Name', phone: '+34000000000' },
            userEmail: 'buyer@example.com',
        })
    })
})
