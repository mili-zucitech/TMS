import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card, CardContent } from '@/components/ui/Card'

interface ReportCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  trend?: { value: number; label?: string }
  className?: string
}

export function ReportCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'from-emerald-500 to-teal-600',
  trend,
  className,
}: ReportCardProps) {
  const trendUp   = trend && trend.value > 0
  const trendDown = trend && trend.value < 0
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus

  return (
    <Card className={cn('relative overflow-hidden transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums truncate">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
            {trend && (
              <div
                className={cn(
                  'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  trendUp
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : trendDown
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>
                  {trendUp ? '+' : ''}
                  {trend.value}%{trend.label ? ` ${trend.label}` : ''}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md',
              iconColor,
            )}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
      {/* Decorative gradient blob */}
      <div
        className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-5"
        aria-hidden
      />
    </Card>
  )
}
