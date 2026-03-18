import { CalendarDays, TrendingDown, CheckCircle2, Clock, Info, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import type { LeaveBalanceResponse } from '../types/leave.types'

interface LeaveBalanceCardProps {
  balances: LeaveBalanceResponse[]
  isLoading: boolean
  onInitialize?: () => void
  isInitializing?: boolean
}

// Visual config per card slot
const CARD_STYLES = [
  {
    gradient: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    barColor: 'bg-blue-500',
    Icon: CalendarDays,
  },
  {
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    Icon: CheckCircle2,
  },
  {
    gradient: 'from-violet-500/10 to-violet-600/5',
    border: 'border-violet-500/20',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    barColor: 'bg-violet-500',
    Icon: Clock,
  },
  {
    gradient: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    barColor: 'bg-amber-500',
    Icon: TrendingDown,
  },
]

export function LeaveBalanceCard({ balances, isLoading, onInitialize, isInitializing }: LeaveBalanceCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-border bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0" />
          No leave balance data available for the current year.
        </div>
        {onInitialize && (
          <Button
            size="sm"
            variant="outline"
            onClick={onInitialize}
            loading={isInitializing}
            className="shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Initialize for {new Date().getFullYear()}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {balances.map((balance, idx) => {
        const style = CARD_STYLES[idx % CARD_STYLES.length]
        const { Icon } = style
        const usedPct =
          balance.totalAllocated > 0
            ? Math.round((balance.usedLeaves / balance.totalAllocated) * 100)
            : 0

        return (
          <div
            key={balance.id}
            className={cn(
              'rounded-2xl border p-4 bg-gradient-to-br',
              style.gradient,
              style.border,
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn('rounded-xl p-2', style.iconBg)}>
                <Icon className={cn('h-4 w-4', style.iconColor)} />
              </div>
              <span className="text-xs text-muted-foreground">{balance.year}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground truncate mb-0.5">
              {balance.leaveTypeName}
            </p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold tabular-nums">
                {balance.remainingLeaves}
              </span>
              <span className="text-xs text-muted-foreground">
                / {balance.totalAllocated} days
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', style.barColor)}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {balance.usedLeaves} used · {usedPct}%
            </p>
          </div>
        )
      })}
    </div>
  )
}
