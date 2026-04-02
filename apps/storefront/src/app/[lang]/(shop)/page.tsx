import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, type Locale } from '@/lib/i18n'
import HeroSection from '@/components/home/HeroSection'
import HeroCarousel from '@/components/home/HeroCarousel'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import TrustSection from '@/components/home/TrustSection'
import ScrollReveal from '@/components/ui/ScrollReveal'
import { organizationJsonLD, websiteJsonLD, safeJsonLd } from '@/lib/seo/jsonld'
import {
  CategoryGridSkeleton,
  ProductGridSkeleton,
} from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getConfig()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  return {
    title: config.meta_title || config.business_name || 'Online Store',
    description:
      config.meta_description ||
      `Discover our products at ${config.business_name || 'our store'}. Fresh quality, fast delivery.`,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: config.meta_title || config.business_name || 'Online Store',
      description:
        config.meta_description ||
        `Shop online at ${config.business_name || 'our store'}`,
      url: siteUrl,
      type: 'website',
    },
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const { config, featureFlags } = await getConfig()
  const dictionary = await getDictionary(lang as Locale)

  // Fetch carousel slides if feature is enabled
  let carouselSlides: import('@/components/home/HeroCarousel').CarouselSlide[] = []
  if (isFeatureEnabled(featureFlags, 'enable_carousel')) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('tenant_id', getRequiredTenantId())
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (error) {
        console.warn('[homepage] carousel_slides query error:', error.message)
      }
      carouselSlides = data ?? []
    } catch (err) {
      console.warn('[homepage] carousel_slides fetch failed:', err)
    }
  }

  return (
    <>
      {/* Structured Data — Organization + WebSite with SearchAction */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLD(config)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLD(config)) }}
      />

      <div id="main-content" className="container-page py-6 space-y-4 md:space-y-8">
        {/* Hero — carousel if enabled and has slides, otherwise static hero */}
        {carouselSlides.length > 0 ? (
          <HeroCarousel slides={carouselSlides} />
        ) : (
          <HeroSection config={config} featureFlags={featureFlags} dictionary={dictionary} lang={lang} />
        )}

        {/* Categories — async (Medusa API) */}
        <ScrollReveal>
          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoryGrid dictionary={dictionary} lang={lang} />
          </Suspense>
        </ScrollReveal>

        <hr className="section-divider" />

        {/* Featured Products — async (Medusa API) */}
        <ScrollReveal delay={100}>
          <Suspense fallback={<ProductGridSkeleton />}>
            <FeaturedProducts dictionary={dictionary} lang={lang} />
          </Suspense>
        </ScrollReveal>

        <hr className="section-divider" />

        {/* Trust Section — static, instant */}
        <ScrollReveal delay={200}>
          <TrustSection dictionary={dictionary} />
        </ScrollReveal>
      </div>
    </>
  )
}
