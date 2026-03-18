/**
 * MultiSelectMembers
 * react-select multi-select for project members with a "Select all" option.
 * Styled to match the app's Tailwind/CSS-variable design system.
 */
import Select, {
  type MultiValue,
  type StylesConfig,
  type OptionProps,
  type GroupBase,
} from 'react-select'
import { Check } from 'lucide-react'

export interface MemberOption {
  value: string
  label: string
}

// ── Special "select all" sentinel value ────────────────────────────────────────
const SELECT_ALL_VALUE = '__select_all__'
const SELECT_ALL_OPTION: MemberOption = {
  value: SELECT_ALL_VALUE,
  label: 'Select all members',
}

interface MultiSelectMembersProps {
  options: MemberOption[]
  value: MemberOption[]
  onChange: (selected: MemberOption[]) => void
  isLoading?: boolean
  isDisabled?: boolean
  placeholder?: string
}

// ── Custom option component with avatar initial ────────────────────────────────
function CustomOption(
  props: OptionProps<MemberOption, true, GroupBase<MemberOption>>,
) {
  const { data, isSelected, isFocused, innerRef, innerProps } = props
  const isAll = data.value === SELECT_ALL_VALUE

  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={[
        'flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none',
        isFocused ? 'bg-accent' : '',
        isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
      ].join(' ')}
    >
      {/* Checkbox indicator */}
      <div
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          isSelected
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-input bg-background',
        ].join(' ')}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>

      {isAll ? (
        <span className="text-sm font-medium">{data.label}</span>
      ) : (
        <>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white">
            {data.label.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm truncate">{data.label}</span>
        </>
      )}
    </div>
  )
}

// ── React-select styles matched to CSS variables ───────────────────────────────
// We keep structural styles in JS and visual styles (color) minimal — most
// visual styling is handled via className on the custom option component above.
function buildStyles(): StylesConfig<MemberOption, true> {
  return {
    container: (base) => ({ ...base, width: '100%' }),
    control: (base, state) => ({
      ...base,
      minHeight: 40,
      borderRadius: '0.5rem',
      borderColor: state.isFocused
        ? 'hsl(var(--ring))'
        : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.3)' : 'none',
      backgroundColor: 'hsl(var(--background))',
      '&:hover': { borderColor: 'hsl(var(--ring))' },
      cursor: 'pointer',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 8px',
      gap: 4,
      flexWrap: 'wrap',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--emerald-500, 160 84% 39%) / 0.12)',
      borderRadius: '999px',
      border: '1px solid hsl(160 84% 39% / 0.25)',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'hsl(160 84% 30%)',
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '1px 6px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'hsl(160 84% 30%)',
      borderRadius: '0 999px 999px 0',
      paddingRight: 4,
      '&:hover': {
        backgroundColor: 'hsl(160 84% 39% / 0.2)',
        color: 'hsl(160 84% 20%)',
      },
    }),
    input: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 20px hsl(0 0% 0% / 0.12)',
      zIndex: 9999,
      overflow: 'hidden',
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: 200,
    }),
    option: () => ({
      // Fully handled by CustomOption className
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
      padding: '12px 16px',
    }),
    loadingMessage: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      transition: 'transform 0.2s',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      '&:hover': { color: 'hsl(var(--foreground))' },
    }),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MultiSelectMembers({
  options,
  value,
  onChange,
  isLoading = false,
  isDisabled = false,
  placeholder = '— Select members —',
}: MultiSelectMembersProps) {
  const allSelected = options.length > 0 && value.length === options.length

  // Prepend the "select all" option
  const displayOptions: MemberOption[] = options.length > 0
    ? [SELECT_ALL_OPTION, ...options]
    : options

  const handleChange = (selected: MultiValue<MemberOption>) => {
    const arr = (selected ?? []) as MemberOption[]

    // If "select all" was just added → select everything (real members only)
    const hasAll = arr.some((o) => o.value === SELECT_ALL_VALUE)
    if (hasAll && !allSelected) {
      onChange([...options])
      return
    }
    // If "select all" was removed (user clicked it while all selected) → clear
    if (!hasAll && allSelected) {
      onChange([])
      return
    }
    // Otherwise filter out the sentinel and pass through
    onChange(arr.filter((o) => o.value !== SELECT_ALL_VALUE))
  }

  // Value shown in control: if all selected, show sentinel too so it appears checked
  const controlValue: MemberOption[] = allSelected
    ? [SELECT_ALL_OPTION, ...value]
    : value

  return (
    <Select<MemberOption, true>
      isMulti
      options={displayOptions}
      value={controlValue}
      onChange={handleChange}
      isLoading={isLoading}
      isDisabled={isDisabled || isLoading}
      placeholder={placeholder}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      isClearable
      styles={buildStyles()}
      components={{ Option: CustomOption }}
      noOptionsMessage={() =>
        isLoading ? 'Loading…' : 'No project members found'
      }
    />
  )
}
