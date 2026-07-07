import { HomeHero } from '@/features/home/components/HomeHero'
import { HomeNewProducts, HomeSaleProducts } from '@/features/home/components/HomeProductSections'
import { HomeUspStrip } from '@/features/home/components/HomeUspStrip'

export function CustomerHomePage() {
  return (
    <>
      <HomeHero />

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <HomeNewProducts />
        <HomeSaleProducts />
        <HomeUspStrip />
      </div>
    </>
  )
}
