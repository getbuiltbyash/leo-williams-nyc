export function normalizePrice(val: string): string {
  if (!val) return ''
  const digits = val.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return `$${parseInt(digits, 10).toLocaleString('en-US')}/mo`
}

export function normalizeBeds(val: string): string {
  if (!val) return ''
  const v = val.trim().toLowerCase()
  if (v.includes('studio') || v === '0') return 'Studio'
  // handle "2br", "2bd", "2bed", "2bedroom", "2 bed", "2 bedroom" etc
  const match = v.match(/(\d+)/)
  return match ? match[1] : val
}

export function normalizeBaths(val: string): string {
  if (!val) return ''
  const v = val.trim().toLowerCase()
  // handle "2ba", "2bath", "2bathroom" etc
  const match = v.match(/(\d+\.?\d*)/)
  return match ? match[1] : val
}

export function normalizeLease(val: string): string {
  if (!val) return ''
  const v = val.trim().toLowerCase()
  if (v.includes('flex')) return 'Flexible'
  const match = v.match(/(\d+)/)
  if (!match) return val
  const n = parseInt(match[1], 10)
  return `${n} month${n === 1 ? '' : 's'}`
}

export function normalizeConcessions(val: string): string {
  if (!val) return ''
  const v = val.trim().toLowerCase()
  const match = v.match(/(\d+)/)
  if (!match) return val
  const n = parseInt(match[1], 10)
  // if it mentions "month" or "mo" or "free"
  if (v.includes('mo') || v.includes('free') || v.includes('month')) {
    return `${n} month${n === 1 ? '' : 's'} free`
  }
  return val
}
