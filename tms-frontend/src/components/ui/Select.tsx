import ReactSelect from 'react-select'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string | number
  label: string
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

interface AppSelectProps {
  value: string | number | null | undefined
  onChange: (value: string | number) => void
  options: SelectOption[] | SelectOptionGroup[]
  placeholder?: string
  isDisabled?: boolean
  isSearchable?: boolean
  isClearable?: boolean
  /** 'sm' = min-h-9, 'md' = min-h-10 (default) */
  size?: 'sm' | 'md'
  /** Renders a destructive border when true */
  error?: boolean
  className?: string
  inputId?: string
  autoFocus?: boolean
}

/** Flatten flat or grouped options into a single array for value lookup. */
function flatOptions(options: SelectOption[] | SelectOptionGroup[]): SelectOption[] {
  if (options.length > 0 && 'options' in options[0]) {
    return (options as SelectOptionGroup[]).flatMap((g) => g.options)
  }
  return options as SelectOption[]
}

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = '— Select —',
  isDisabled = false,
  isSearchable = true,
  isClearable = false,
  size = 'md',
  error = false,
  className,
  inputId,
  autoFocus,
}: AppSelectProps) {
  const selected = flatOptions(options).find((o) => o.value === value) ?? null

  return (
    <ReactSelect
      unstyled
      inputId={inputId}
      autoFocus={autoFocus}
      value={selected}
      onChange={(opt) => {
        if (opt) onChange(opt.value)
        else onChange('')
      }}
      options={options}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      isClearable={isClearable}
      placeholder={placeholder}
      className={className}
      classNames={{
        container: () => 'relative w-full',
        control: ({ isFocused }) =>
          cn(
            'flex items-center w-full rounded-lg border bg-background px-2 text-sm cursor-pointer transition-colors ring-offset-background',
            size === 'sm' ? 'min-h-[2.25rem]' : 'min-h-[2.5rem]',
            isFocused
              ? 'border-ring ring-2 ring-ring ring-offset-1 outline-none'
              : error
                ? 'border-destructive'
                : 'border-input',
            isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          ),
        valueContainer: () => 'py-0.5 gap-1 flex-1',
        placeholder: () => 'text-muted-foreground text-sm',
        singleValue: () => 'text-foreground text-sm',
        input: () => 'text-foreground text-sm',
        indicatorsContainer: () => 'flex items-center',
        indicatorSeparator: () => 'hidden',
        dropdownIndicator: () => 'text-muted-foreground hover:text-foreground px-1 py-0',
        clearIndicator: () => 'text-muted-foreground hover:text-destructive px-1 py-0',
        menu: () =>
          'absolute z-50 mt-1 w-full rounded-lg border border-border bg-card p-1 shadow-md',
        menuList: () => 'max-h-60 overflow-auto rounded-lg',
        option: ({ isSelected, isFocused }) =>
          cn(
            'px-2.5 py-2 text-sm rounded-md cursor-pointer',
            isSelected && 'bg-primary text-primary-foreground',
            !isSelected && isFocused && 'bg-muted',
            !isSelected && !isFocused && 'text-foreground',
          ),
        group: () => 'pt-1',
        groupHeading: () =>
          'px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground',
        noOptionsMessage: () => 'px-3 py-2 text-sm text-muted-foreground text-center',
      }}
    />
  )
}
