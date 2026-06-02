export type CategoryPublic = {
  id: string
  slug: string
  name: string
  description: string | null
  parent_id: string | null
  sort_order: number
  is_featured: boolean
  image_url: string | null
}

export type CategoryDetail = CategoryPublic & {
  is_active: boolean
  product_count: number
  created_at: string
  updated_at: string
}

export type CategoryListResponse = {
  items: CategoryPublic[]
  total: number
}

export type CategoryTreeNode = CategoryPublic & {
  children: CategoryTreeNode[]
}
