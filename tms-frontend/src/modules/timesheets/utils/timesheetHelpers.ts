// ── Date helpers for Monday-anchored week arithmetic ──────────────────────────

/**
 * Returns the Monday of the ISO week containing `date`.
 * ISO week = Mon..Sun.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/** Returns the Sunday of the same ISO week as `weekStart`. */
export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d
}

/** Format a Date as "YYYY-MM-DD". */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Get all 7 dates of the week starting on `weekStart`. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Parse "HH:mm" or "HH:mm:ss" → total minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

/**
 * Calculate duration in minutes: endTime - startTime.
 * Returns 0 if end <= start.
 */
export function calcDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return Math.max(0, end - start)
}

/** Format minutes as "Xh Ym" display string. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Format "YYYY-MM-DD" as short display e.g. "Mon, Mar 9". */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Format "YYYY-MM-DD" as long display e.g. "Monday, March 9". */
export function formatLongDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Format "YYYY-MM-DD" → "Mar 9". */
export function formatMediumDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Format "YYYY-MM-DD" → "Mon". */
export function formatWeekdayShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })
}

/** Normalize "HH:mm" → "HH:mm:00" for backend LocalTime. */
export function normalizeTime(time: string): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`
  return time
}

/** Strip seconds from "HH:mm:ss" → "HH:mm" for display / input. */
export function stripSeconds(time: string): string {
  if (!time) return ''
  return time.substring(0, 5)
}

/**
 * Convert a 24-hour "HH:mm" or "HH:mm:ss" string to 12-hour display format.
 * e.g. "09:30" → "9:30 AM",  "14:15" → "2:15 PM"
 */
export function format12h(time: string): string {
  if (!time) return ''
  const hhmm = time.substring(0, 5)
  const [hStr, mStr] = hhmm.split(':')
  const h24 = parseInt(hStr, 10)
  if (isNaN(h24)) return hhmm
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12    = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mStr} ${period}`
}

/**
 * Check if two time ranges on the same day overlap.
 * [start1, end1) overlaps [start2, end2) iff start1 < end2 && end1 > start2
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  return s1 < e2 && e1 > s2
}

/**
 * Split a day's entries into regular (≤ 8h) and overtime (> 8h) buckets.
 * Entries are sorted by startTime first; the entry that first causes the
 * cumulative total to EXCEED the threshold begins the overtime section —
 * it is NOT split mid-entry.
 *
 * Edge cases handled:
 *  - Single entry > 8h        → entirely in overtime
 *  - Single entry exactly 8h  → regular (8h is not overtime)
 *  - Multiple entries > 8h    → the entry that pushes past 8h is overtime
 *  - Empty array              → { regular: [], overtime: [] }
 */
export function splitOvertimeEntries<T extends { startTime: string; endTime: string; durationMinutes: number | null }>(
  entries: T[],
  thresholdMinutes = 480,
): { regular: T[]; overtime: T[] } {
  const sorted = [...entries].sort((a, b) =>
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )
  let cumulative = 0
  let overtimeIndex = sorted.length // default: all regular
  for (let i = 0; i < sorted.length; i++) {
    const mins = sorted[i].durationMinutes ?? calcDurationMinutes(sorted[i].startTime, sorted[i].endTime)
    // Post-add check: catches single entries that alone exceed threshold
    if (cumulative + mins > thresholdMinutes) {
      overtimeIndex = i
      break
    }
    cumulative += mins
  }
  return {
    regular: sorted.slice(0, overtimeIndex),
    overtime: sorted.slice(overtimeIndex),
  }
}

/** Format "YYYY-MM-DD" as "DD MMM YYYY". */
export function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
