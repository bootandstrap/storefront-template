/**
 * Social Media Dashboard — Owner Panel
 *
 * Manages social media connections (Instagram, Facebook, TikTok, Google Maps).
 * Gated by enable_social_media feature flag (module: RRSS).
 * SOTA 2026: ModuleShell wrapper with tier awareness.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
import { Share2 } from 'lucide-react'
import SocialMediaClient from './SocialMediaClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.social.title') }
}

export default async function SocialMediaPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const isLocked = !featureFlags.enable_social_media
    const cfgAny = config as unknown as Record<string, unknown>

    const tierInfo = {
        currentTier: isLocked ? 'Free' : 'Activo',
        moduleKey: 'rrss',
        nextTierFeatures: isLocked ? [
            t('panel.social.feat.links') || 'Enlaces sociales en tu tienda',
            t('panel.social.feat.sharing') || 'Botones de compartir productos',
            t('panel.social.feat.feed') || 'Feed de Instagram integrado',
        ] : undefined,
        nextTierName: isLocked ? 'RRSS Standard' : undefined,
        nextTierPrice: isLocked ? 0 : undefined,
    }

    const connections = {
        instagram: !!config.social_instagram,
        facebook: !!config.social_facebook,
        tiktok: !!config.social_tiktok,
        googleMaps: !!(cfgAny.social_google_maps),
    }

    return (
        <ModuleShell
            icon={<Share2 className="w-5 h-5" />}
            title={t('panel.social.title') || 'Redes Sociales'}
            subtitle={t('panel.social.subtitle') || 'Conecta tus redes sociales para ampliar tu alcance'}
            isLocked={isLocked}
            gateFlag="enable_social_media"
            tierInfo={tierInfo}
            lang={lang}
        >
            <SocialMediaClient
                connections={connections}
                socialLinks={{
                    instagram: config.social_instagram ?? '',
                    facebook: config.social_facebook ?? '',
                    tiktok: config.social_tiktok ?? '',
                }}
                labels={{
                    connectedAccounts: t('panel.social.connectedAccounts'),
                    googleMaps: t('panel.social.googleMaps'),
                    googleMapsDesc: t('panel.social.googleMapsDesc'),
                    instagram: t('panel.social.instagram'),
                    instagramDesc: t('panel.social.instagramDesc'),
                    facebook: t('panel.social.facebook'),
                    facebookDesc: t('panel.social.facebookDesc'),
                    tiktok: t('panel.social.tiktok'),
                    tiktokDesc: t('panel.social.tiktokDesc'),
                    connect: t('panel.social.connect'),
                    disconnect: t('panel.social.disconnect'),
                    connected: t('panel.social.connected'),
                    notConnected: t('panel.social.notConnected'),
                    tabConnections: t('panel.social.tabConnections'),
                    tabFeed: t('panel.social.tabFeed'),
                    tabSettings: t('panel.social.tabSettings'),
                }}
                lang={lang}
            />
        </ModuleShell>
    )
}
