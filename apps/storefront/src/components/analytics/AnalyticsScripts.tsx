import Script from 'next/script'

import WebVitalsReporter from '@/components/WebVitalsReporter'

interface AnalyticsScriptsProps {
    enabled: boolean
    facebookPixelId?: string | null
    googleAnalyticsId?: string | null
}

export default function AnalyticsScripts({
    enabled,
    facebookPixelId,
    googleAnalyticsId,
}: AnalyticsScriptsProps) {
    if (!enabled) return null

    return (
        <>
            {googleAnalyticsId && /^[A-Za-z0-9_-]+$/.test(googleAnalyticsId) && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
                        strategy="afterInteractive"
                    />
                    <Script id="gtag-init" strategy="afterInteractive">
                        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAnalyticsId}');`}
                    </Script>
                </>
            )}

            {facebookPixelId && /^[0-9]+$/.test(facebookPixelId) && (
                <Script id="fb-pixel" strategy="afterInteractive">
                    {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${facebookPixelId}');fbq('track','PageView');`}
                </Script>
            )}

            <WebVitalsReporter />
        </>
    )
}
