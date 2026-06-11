/**
 * 12-hour time picker — three React Select dropdowns (Hour | Minute | AM/PM)
 * styled to appear as one grouped control.
 * External value / onChange use 24-hour "HH:mm" strings (backend-safe).
 * `open` and `onOpenChange` are accepted but unused (kept for API compatibility).
 */

import Select, { type StylesConfig, type SingleValue } from 'react-select'

type Opt = { label: string; value: string }

const HOUR_OPTIONS: Opt[] = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => ({
  label: String(h).padStart(2, '0'),
  value: String(h),
}))

const MINUTE_OPTIONS: Opt[] = Array.from({ length: 12 }, (_, i) => {
  const m = String(i * 5).padStart(2, '0')
  return { label: m, value: m }
})

const PERIOD_OPTIONS: Opt[] = [
  { label: 'AM', value: 'AM' },
  { label: 'PM', value: 'PM' },
]

function parse(time24: string): { h: number; m: string; period: 'AM' | 'PM' } {
  if (!time24) return { h: 0, m: '', period: 'AM' }
  const [hStr, mStr] = time24.split(':')
  const h24 = parseInt(hStr, 10)
  if (isNaN(h24)) return { h: 0, m: '', period: 'AM' }
  return {
    h:      h24 % 12 === 0 ? 12 : h24 % 12,
    m:      (mStr ?? '00').slice(0, 2),
    period: h24 < 12 ? 'AM' : 'PM',
  }
}

function build(h: number, m: string, period: 'AM' | 'PM'): string {
  if (!h) return ''
  const resolvedM = m || '00'
  const h24 = period === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12)
  return `${String(h24).padStart(2, '0')}:${resolvedM}`
}

/** Shared React Select styles for the grouped look */
function makeStyles(pos: 'left' | 'middle' | 'right'): StylesConfig<Opt, false> {
  const radius = {
    left:   '0.5rem 0 0 0.5rem',
    middle: '0',
    right:  '0 0.5rem 0.5rem 0',
  }[pos]

  return {
    container: (base) => ({ ...base, minWidth: 0 }),
    control: (base, state) => ({
      ...base,
      height: 36,
      minHeight: 36,
      borderRadius: radius,
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
      // Remove double borders between segments
      ...(pos === 'middle' || pos === 'right'
        ? { marginLeft: -1 }
        : {}),
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.25)' : 'none',
      backgroundColor: 'hsl(var(--background))',
      '&:hover': { borderColor: 'hsl(var(--ring) / 0.6)', zIndex: 1 },
      cursor: 'pointer',
      zIndex: state.isFocused ? 2 : 1,
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 6px',
      justifyContent: 'center',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
      fontWeight: 500,
      margin: 0,
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      padding: '0 2px',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '0 4px',
      color: 'hsl(var(--muted-foreground))',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 16px hsl(0 0% 0% / 0.12)',
      zIndex: 9999,
      minWidth: 'max-content',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menuList: (base) => ({
      ...base,
      padding: '4px',
      maxHeight: 200,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: state.isSelected ? 600 : 400,
      color: state.isSelected ? '#fff' : 'hsl(var(--foreground))',
      backgroundColor: state.isSelected
        ? 'hsl(160 84% 39%)'
        : state.isFocused
          ? 'hsl(var(--muted))'
          : 'transparent',
      cursor: 'pointer',
      padding: '6px 10px',
      '&:active': { backgroundColor: 'hsl(160 84% 39% / 0.8)' },
    }),
  }
}

interface TimePicker12Props {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** @deprecated No-op — kept for API compatibility. */
  open?: boolean
  /** @deprecated No-op — kept for API compatibility. */
  onOpenChange?: (open: boolean) => void
}

export function TimePicker12({ value, onChange, disabled }: TimePicker12Props) {
  const { h, m, period } = parse(value)

  // Minute options — include legacy non-5-min values
  const minuteOpts = MINUTE_OPTIONS.some((o) => o.value === m)
    ? MINUTE_OPTIONS
    : m
      ? [{ label: m, value: m }, ...MINUTE_OPTIONS]
      : MINUTE_OPTIONS

  const hourVal    = h   ? HOUR_OPTIONS.find((o) => o.value === String(h)) ?? null : null
  const minuteVal  = m   ? minuteOpts.find((o) => o.value === m) ?? null          : null
  const periodVal  = PERIOD_OPTIONS.find((o) => o.value === period) ?? PERIOD_OPTIONS[0]

  const setHour   = (opt: SingleValue<Opt>) => onChange(build(opt ? Number(opt.value) : 0, m, period))
  const setMinute = (opt: SingleValue<Opt>) => onChange(build(h || 12, opt ? opt.value : '00', period))
  const setPeriod = (opt: SingleValue<Opt>) => onChange(build(h || 12, m || '00', (opt?.value ?? 'AM') as 'AM' | 'PM'))

  return (
    <div className="flex items-stretch" style={{ minWidth: 0 }}>
      <Select<Opt>
        options={HOUR_OPTIONS}
        value={hourVal}
        onChange={setHour}
        isDisabled={disabled}
        isSearchable={false}
        placeholder="HH"
        styles={makeStyles('left')}
        menuPlacement="auto"
        menuPosition="fixed"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuShouldScrollIntoView={false}
        aria-label="Hour"
      />
      <Select<Opt>
        options={minuteOpts}
        value={minuteVal}
        onChange={setMinute}
        isDisabled={disabled}
        isSearchable={false}
        placeholder="MM"
        styles={makeStyles('middle')}
        menuPlacement="auto"
        menuPosition="fixed"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuShouldScrollIntoView={false}
        aria-label="Minute"
      />
      <Select<Opt>
        options={PERIOD_OPTIONS}
        value={periodVal}
        onChange={setPeriod}
        isDisabled={disabled}
        isSearchable={false}
        styles={makeStyles('right')}
        menuPlacement="auto"
        menuPosition="fixed"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuShouldScrollIntoView={false}
        aria-label="AM or PM"
      />
    </div>
  )
}

