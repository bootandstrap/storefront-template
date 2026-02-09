import { Suspense } from 'react'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, type Locale } from '@/lib/i18n'
import HeroSection from '@/components/home/HeroSection'
import HeroCarousel from '@/components/home/HeroCarousel'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import TrustSection from '@/components/home/TrustSection'
import {
  HeroSkeleton,
  CategoryGridSkeleton,
  ProductGridSkeleton,
} from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

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
    const supabase = await createClient()
    const { data } = await supabase
      .from('carousel_slides')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    carouselSlides = data ?? []
  }

  return (
    <div className="container-page py-6 space-y-4 md:space-y-8">
      {/* Hero — carousel if enabled and has slides, otherwise static hero */}
      {carouselSlides.length > 0 ? (
        <HeroCarousel slides={carouselSlides} />
      ) : (
        <HeroSection config={config} featureFlags={featureFlags} dictionary={dictionary} />
      )}

      {/* Categories — async (Medusa API) */}
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid dictionary={dictionary} />
      </Suspense>

      {/* Featured Products — async (Medusa API) */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <FeaturedProducts dictionary={dictionary} />
      </Suspense>

      {/* Trust Section — static, instant */}
      <TrustSection dictionary={dictionary} />
    </div>
  )
}
