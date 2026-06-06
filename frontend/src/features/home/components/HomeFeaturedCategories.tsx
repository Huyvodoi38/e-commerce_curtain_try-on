import { Link } from 'react-router-dom'
import { useFeaturedCategoriesQuery } from '@/features/categories/hooks'
import { categoryProductsPath, FEATURED_MENU_LIMIT } from '@/lib/catalog/categories'
import { HomeSectionHeader } from '@/features/home/components/HomeSectionHeader'

export function HomeFeaturedCategories() {
  const categoriesQuery = useFeaturedCategoriesQuery()
  const items = (categoriesQuery.data?.items ?? []).slice(0, FEATURED_MENU_LIMIT)

  if (categoriesQuery.isError) {
    return null
  }

  if (categoriesQuery.isLoading) {
    return (
      <section aria-labelledby="home-categories-heading">
        <HomeSectionHeader title="Danh mục nổi bật" headingId="home-categories-heading" viewAllTo="/products" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="home-categories-heading">
      <HomeSectionHeader title="Danh mục nổi bật" viewAllTo="/products" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((category) => (
          <Link
            key={category.id}
            to={categoryProductsPath(category.slug)}
            className="group rounded-xl border border-border bg-surface-raised p-4 transition hover:border-brand/40 hover:shadow-sm"
          >
            <p className="font-medium text-foreground group-hover:text-brand">{category.name}</p>
            {category.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">{category.description}</p>
            ) : (
              <p className="mt-1 text-sm text-foreground-subtle">Xem sản phẩm</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
