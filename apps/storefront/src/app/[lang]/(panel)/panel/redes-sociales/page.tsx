/**
 * Social Media Dashboard — Owner Panel
 *
 * Manages social media connections (Instagram, Facebook, TikTok, Google Maps).
 * Gated by enable_social_media feature flag (module: RRSS).
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
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

    if (!featureFlags.enable_social_media) {
        return <FeatureGate flag="enable_social_media" lang={lang} />
    }

    const connections = {
        instagram: !!config.social_instagram,
        facebook: !!config.social_facebook,
        tiktok: !!config.social_tiktok,
        googleMaps: false, // placeholder — no config field yet
    }

    const connectedCount = Object.values(connections).filter(Boolean).length

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.social.title')}
                subtitle={t('panel.social.subtitle')}
                icon={<Share2 className="w-5 h-5" />}
                badge={connectedCount}
            />
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
        </div>
    )
}
