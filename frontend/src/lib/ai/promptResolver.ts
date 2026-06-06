/** Map thuộc tính rèm (VI) → prompt EN — mirror backend prompt_resolver. */

export type AiResolveResult = {
  available: boolean
  missingSlots: string[]
  unmapped: string[]
}

const SLOT_LABELS_VI: Record<string, string> = {
  color: 'Màu sắc',
  material: 'Chất liệu',
  pattern: 'Kiểu hoa văn',
  opacity: 'Độ che sáng',
  texture: 'Kiểu nếp',
  header: 'Kiểu treo',
}

const REQUIRED_SLOTS = ['color', 'material', 'pattern', 'opacity'] as const

const SLOT_KEY_ALIASES: Record<string, string[]> = {
  color: ['mau sac', 'mau', 'color'],
  material: ['chat lieu', 'vai', 'material', 'chat lieu vai'],
  pattern: ['kieu hoa van', 'hoa van', 'pattern', 'kieu dang'],
  opacity: ['do che sang', 'che sang', 'opacity'],
  texture: ['kieu nep', 'texture', 'kieu gap'],
  header: ['kieu treo', 'chieu dai', 'header', 'do dai'],
}

const VALUE_MAP: Record<string, Record<string, string>> = {
  color: {
    trang: 'white',
    white: 'white',
    be: 'beige',
    beige: 'beige',
    kem: 'cream',
    cream: 'cream',
    xam: 'grey',
    grey: 'grey',
    gray: 'grey',
    'xam dam': 'charcoal',
    charcoal: 'charcoal',
    navy: 'navy blue',
    'xanh navy': 'navy blue',
    'xanh la nhat': 'sage green',
    'sage green': 'sage green',
    den: 'dark grey',
    'den dam': 'dark grey',
  },
  material: {
    cotton: 'cotton',
    'vai cotton': 'cotton',
    linen: 'linen',
    lanh: 'linen',
    'vai linen': 'linen',
    polyester: 'polyester',
    voan: 'sheer voile',
    'sheer voile': 'sheer voile',
    velvet: 'velvet',
    nhung: 'velvet',
    'tre truc': 'bamboo blend',
    'bamboo blend': 'bamboo blend',
    'to on': 'polyester blackout blend',
  },
  pattern: {
    tron: 'solid',
    solid: 'solid',
    trơn: 'solid',
    soc: 'striped',
    striped: 'striped',
    sọc: 'striped',
    hoa: 'floral',
    floral: 'floral',
    geometric: 'geometric',
    'hoa tiet': 'geometric',
    'det kim': 'textured weave',
    'textured weave': 'textured weave',
  },
  opacity: {
    mong: 'sheer light-filtering',
    'sheer light-filtering': 'sheer light-filtering',
    'loc sang': 'sheer light-filtering',
    'cản sáng vừa': 'semi-blackout',
    'can sang vua': 'semi-blackout',
    'semi-blackout': 'semi-blackout',
    'chan sang': 'blackout',
    'chắn sáng': 'blackout',
    'to on': 'blackout',
  },
  texture: {
    'mem tu nhien': 'soft natural folds',
    'soft natural folds': 'soft natural folds',
    'gap ly': 'crisp pleated',
    'crisp pleated': 'crisp pleated',
    'roi tu nhien': 'flowing drape',
    'flowing drape': 'flowing drape',
    'day sang trong': 'heavy luxurious',
    'heavy luxurious': 'heavy luxurious',
  },
  header: {
    'sat tran': 'ceiling to floor',
    'ceiling to floor': 'ceiling to floor',
    'sát trần': 'ceiling to floor',
    'ngang cua so': 'sill length',
    'sill length': 'sill length',
    'keo dai xuong san': 'pooled on floor',
    'pooled on floor': 'pooled on floor',
  },
}

export const SUGGESTED_ATTRIBUTE_ROWS = [
  { key: 'Màu sắc', value: 'Trắng' },
  { key: 'Chất liệu', value: 'Cotton' },
  { key: 'Kiểu hoa văn', value: 'Trơn' },
  { key: 'Độ che sáng', value: 'Chắn sáng' },
] as const

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function slotForKey(key: string): string | null {
  const norm = normalizeText(key)
  for (const [slot, aliases] of Object.entries(SLOT_KEY_ALIASES)) {
    if (aliases.includes(norm)) return slot
  }
  return null
}

function mapValue(slot: string, rawValue: string): string | null {
  const norm = normalizeText(rawValue)
  if (!norm) return null
  const slotMap = VALUE_MAP[slot] ?? {}
  if (slotMap[norm]) return slotMap[norm]
  for (const [key, en] of Object.entries(slotMap)) {
    if (norm.includes(key) || key.includes(norm)) return en
  }
  return null
}

export function attributesToRecord(rows: { key: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    const value = row.value.trim()
    if (key && value) result[key] = value
  }
  return result
}

export function recordToAttributeRows(record: Record<string, unknown>): { key: string; value: string }[] {
  const rows = Object.entries(record)
    .filter(([, v]) => v != null && String(v).trim())
    .map(([key, value]) => ({ key, value: String(value) }))
  return rows.length ? rows : [{ key: '', value: '' }]
}

export function resolveAiPromptFromAttributes(attributes: Record<string, unknown>): AiResolveResult {
  const flat: Record<string, string> = {}
  for (const [key, value] of Object.entries(attributes)) {
    const text = value == null ? '' : String(value).trim()
    if (text) flat[key.trim()] = text
  }

  if (Object.keys(flat).length === 0) {
    return {
      available: false,
      missingSlots: REQUIRED_SLOTS.map((s) => SLOT_LABELS_VI[s]),
      unmapped: [],
    }
  }

  const resolved: Record<string, string> = {}
  const unmapped: string[] = []

  for (const [key, value] of Object.entries(flat)) {
    const slot = slotForKey(key)
    if (!slot) continue
    const mapped = mapValue(slot, value)
    if (!mapped) {
      unmapped.push(`${SLOT_LABELS_VI[slot] ?? slot}: ${value}`)
      continue
    }
    resolved[slot] = mapped
  }

  const missingSlots = REQUIRED_SLOTS.filter((s) => !resolved[s]).map((s) => SLOT_LABELS_VI[s])

  return {
    available: missingSlots.length === 0 && unmapped.length === 0,
    missingSlots,
    unmapped,
  }
}
