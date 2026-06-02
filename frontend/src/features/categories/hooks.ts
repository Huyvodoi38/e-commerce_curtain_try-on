import { useQuery } from '@tanstack/react-query'
import { fetchCategories, fetchCategoriesTree, fetchCategoryBySlug } from './api'

const STALE_MS = 5 * 60 * 1000

export function useFeaturedCategoriesQuery() {
  return useQuery({
    queryKey: ['categories', { featuredOnly: true }],
    queryFn: () => fetchCategories(true),
    staleTime: STALE_MS,
  })
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ['categories', { featuredOnly: false }],
    queryFn: () => fetchCategories(false),
    staleTime: STALE_MS,
  })
}

export function useCategoryQuery(slug: string) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: () => fetchCategoryBySlug(slug),
    staleTime: STALE_MS,
    enabled: slug.length > 0,
  })
}

export function useCategoriesTreeQuery() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: fetchCategoriesTree,
    staleTime: STALE_MS,
  })
}
