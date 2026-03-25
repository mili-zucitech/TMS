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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] rounded-xl border border-border bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {balances.map((balance, idx) => {
        const style = CARD_STYLES[idx % CARD_STYLES.length]
        const { Icon } = style
        const usedPct =
          balance.totalAllocated > 0
            ? Math.round((balance.usedLeaves / balance.totalAllocated) * 100)
            : 0
        const remainingPct = 100 - usedPct

        return (
          <div
            key={balance.id}
            className={cn(
              'rounded-xl border p-3 bg-gradient-to-br flex items-center gap-3',
              style.gradient,
              style.border,
            )}
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', style.iconBg)}>
              <Icon className={cn('h-4 w-4', style.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate leading-none mb-1">
                {balance.leaveTypeName}
              </p>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-lg font-bold tabular-nums leading-none">
                  {balance.remainingLeaves}
                </span>
                <span className="text-[11px] text-muted-foreground">/ {balance.totalAllocated}d</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', style.barColor)}
                    style={{ width: `${remainingPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{usedPct}% used</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
