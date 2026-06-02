/** Giá trị `district` khi lưu địa chỉ theo mô hình 2 cấp (tỉnh → xã/phường, không có quận/huyện). */
export const VN_TWO_TIER_DISTRICT = '—'

export function isTwoTierDistrict(district: string): boolean {
  const t = district.trim()
  return t === VN_TWO_TIER_DISTRICT || t === '' || t === '(2 cấp)'
}
