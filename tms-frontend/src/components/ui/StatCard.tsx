import { cn } from '@/utils/cn'

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  /** Tailwind gradient + shadow classes for the icon background. Defaults to emerald. */
  iconClassName?: string
}

/**
 * Small stat summary card used in manager dashboards and timesheet views.
 *
 * ```tsx
 * <StatCard icon={Clock} label="Total Hours" value="37h 30m" />
 * <StatCard icon={CalendarX2} label="Leave Days" value="2"
 *   iconClassName="from-violet-500 to-purple-600 shadow-violet-500/20" />
 * ```
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  iconClassName = 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
}: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md',
          iconClassName,
        )}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}
