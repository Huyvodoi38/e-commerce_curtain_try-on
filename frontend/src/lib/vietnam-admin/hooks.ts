import { useQuery } from '@tanstack/react-query'
import type { ShippingAddress } from '@/features/orders/types'
import { VN_TWO_TIER_DISTRICT } from '@/lib/vietnam-admin/constants'

/** Tải lazy — chỉ khi vào checkout (chunk ~2MB, NQ 202/2025). */
async function vnV3() {
  return import('vietnam-divisions-js/v3')
}

export const vnProvincesQueryKey = ['vn-admin', 'provinces'] as const

export function useVietnamProvincesQuery() {
  return useQuery({
    queryKey: vnProvincesQueryKey,
    queryFn: async () => {
      const { getAllProvincesSorted } = await vnV3()
      return getAllProvincesSorted()
    },
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useVietnamCommunesQuery(provinceId: string | undefined) {
  return useQuery({
    queryKey: ['vn-admin', 'communes', provinceId] as const,
    queryFn: async () => {
      const { getCommunesByProvinceId } = await vnV3()
      return getCommunesByProvinceId(provinceId!)
    },
    enabled: Boolean(provinceId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export async function resolveShippingAdminIds(
  cityName: string | undefined,
  wardName: string | undefined,
): Promise<{ provinceId: string; communeId: string } | null> {
  if (!cityName?.trim()) return null
  const { getAllProvincesSorted, getCommunesByProvinceId } = await vnV3()
  const provinces = await getAllProvincesSorted()
  const cityNorm = cityName.trim().toLowerCase()
  const province =
    provinces.find((p) => p.name.toLowerCase() === cityNorm) ??
    provinces.find(
      (p) =>
        p.shortName.toLowerCase() === cityNorm ||
        p.name.toLowerCase().includes(cityNorm) ||
        cityNorm.includes(p.shortName.toLowerCase()),
    )
  if (!province) return null
  if (!wardName?.trim()) {
    return { provinceId: province.idProvince, communeId: '' }
  }
  const communes = await getCommunesByProvinceId(province.idProvince)
  const wardNorm = wardName.trim().toLowerCase()
  const commune =
    communes.find((c) => c.name.toLowerCase() === wardNorm) ??
    communes.find((c) => c.name.toLowerCase().includes(wardNorm) || wardNorm.includes(c.name.toLowerCase()))
  if (!commune) {
    return { provinceId: province.idProvince, communeId: '' }
  }
  return { provinceId: province.idProvince, communeId: commune.idCommune }
}

export async function buildShippingAddressFromForm(values: {
  full_name: string
  phone: string
  line1: string
  province_id: string
  commune_id: string
  note?: string
}): Promise<ShippingAddress> {
  const { getProvinceById, getCommuneById } = await vnV3()
  const province = await getProvinceById(values.province_id)
  const commune = await getCommuneById(values.commune_id)
  if (!province || !commune || commune.idProvince !== province.idProvince) {
    throw new Error('Địa chỉ hành chính không hợp lệ')
  }
  const note = values.note?.trim()
  return {
    full_name: values.full_name.trim(),
    phone: values.phone.trim(),
    line1: values.line1.trim(),
    ward: commune.name,
    district: VN_TWO_TIER_DISTRICT,
    city: province.name,
    note: note || null,
  }
}
