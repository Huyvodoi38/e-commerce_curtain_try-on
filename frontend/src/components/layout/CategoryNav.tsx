import { Link } from 'react-router-dom'
import type { CategoryTreeNode } from '@/features/categories/types'
import { useCategoriesTreeQuery, useFeaturedCategoriesQuery } from '@/features/categories/hooks'
import { categoryProductsPath, FEATURED_MENU_LIMIT } from '@/lib/catalog/categories'

export function CategoryNav() {
  const featured = useFeaturedCategoriesQuery()
  const tree = useCategoriesTreeQuery()

  const featuredItems = (featured.data?.items ?? []).slice(0, FEATURED_MENU_LIMIT)
  const treeRoots = Array.isArray(tree.data) ? tree.data : []
  const isLoading = featured.isLoading || tree.isLoading

  return (
    <nav className="border-t border-border-subtle bg-surface-raised" aria-label="Danh mục sản phẩm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2 text-sm">
        <CatalogDropdown
          roots={treeRoots}
          isLoading={tree.isLoading}
          isError={tree.isError}
        />

        <span className="mx-1 hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />

        {isLoading && featuredItems.length === 0 ? (
          <CategoryNavSkeleton />
        ) : (
          featuredItems.map((cat) => (
            <Link
              key={cat.id}
              to={categoryProductsPath(cat.slug)}
              className="shrink-0 rounded-md px-3 py-1.5 font-medium text-foreground-muted hover:bg-brand-subtle hover:text-brand"
            >
              {cat.name}
            </Link>
          ))
        )}

        <Link
          to="/products"
          className="ml-auto shrink-0 rounded-md px-3 py-1.5 text-foreground-muted hover:text-brand"
        >
          Tất cả sản phẩm
        </Link>
      </div>
    </nav>
  )
}

type CatalogDropdownProps = {
  roots: CategoryTreeNode[]
  isLoading: boolean
  isError: boolean
}

function CatalogDropdown({ roots, isLoading, isError }: CatalogDropdownProps) {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-3 py-1.5 font-semibold text-brand hover:bg-brand-subtle"
        aria-haspopup="true"
        aria-expanded="false"
      >
        Danh mục sản phẩm
        <ChevronIcon />
      </button>

      <div
        className="invisible absolute left-0 top-full z-50 pt-1 opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        role="menu"
      >
        <ul className="min-w-[220px] max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-border bg-surface-raised py-2 shadow-lg">
          {isLoading && (
            <li className="px-4 py-2 text-foreground-subtle" role="none">
              Đang tải…
            </li>
          )}
          {isError && !isLoading && (
            <li className="px-4 py-2 text-foreground-subtle" role="none">
              Không tải được danh mục
            </li>
          )}
          {!isLoading && !isError && roots.length === 0 && (
            <li className="px-4 py-2 text-foreground-subtle" role="none">
              Chưa có danh mục
            </li>
          )}
          {!isLoading &&
            !isError &&
            roots.map((node) => <CategoryTreeMenuItems key={node.id} node={node} depth={0} />)}
        </ul>
      </div>
    </div>
  )
}

function CategoryTreeMenuItems({ node, depth }: { node: CategoryTreeNode; depth: number }) {
  const paddingLeft = 16 + depth * 12

  return (
    <>
      <li role="none">
        <Link
          to={categoryProductsPath(node.slug)}
          role="menuitem"
          style={{ paddingLeft }}
          className="block py-2.5 pr-4 text-foreground-muted hover:bg-brand-subtle hover:text-brand"
        >
          {node.name}
        </Link>
      </li>
      {(Array.isArray(node.children) ? node.children : []).map((child) => (
        <CategoryTreeMenuItems key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  )
}

function CategoryNavSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block h-8 w-20 shrink-0 animate-pulse rounded-md bg-surface-muted"
          aria-hidden
        />
      ))}
    </>
  )
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
