import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  iconColor?: string
  trend?: { value: number; label: string }
  isLoading?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary bg-primary/10',
  trend,
  isLoading,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-24 rounded-full bg-muted animate-pulse" />
            <div className="h-7 w-16 rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border bg-card p-5 shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-1.5 text-xs font-medium',
                trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// ── DashboardCard ─────────────────────────────────────────────────────────────

interface DashboardCardProps {
  title: string
  description?: string
  icon?: React.ElementType
  action?: ReactNode
  children: ReactNode
  isLoading?: boolean
  className?: string
  bodyClassName?: string
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  isLoading,
  className,
  bodyClassName,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn('p-5', isLoading && 'min-h-[160px]', bodyClassName)}>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

// ── ChartCard ─────────────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string
  description?: string
  icon?: React.ElementType
  action?: ReactNode
  children: ReactNode
  isLoading?: boolean
  className?: string
  height?: number
}

export function ChartCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  isLoading,
  className,
  height = 240,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">
        {isLoading ? (
          <div
            className="rounded-xl bg-muted/40 animate-pulse w-full"
            style={{ height }}
          />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

// ── Skeleton grid helper ──────────────────────────────────────────────────────

interface SkeletonGridProps {
  count?: number
  columns?: string
}

export function SkeletonGrid({ count = 4, columns = 'grid-cols-2 lg:grid-cols-4' }: SkeletonGridProps) {
  return (
    <div className={cn('grid gap-4', columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCard
          key={i}
          title=""
          value=""
          icon={() => null}
          isLoading
        />
      ))}
    </div>
  )
}

// ── Welcome header ────────────────────────────────────────────────────────────

interface WelcomeHeaderProps {
  name: string | null
  role: string | null
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomeHeader({ name, role }: WelcomeHeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const roleLabel = role ? role.charAt(0) + role.slice(1).toLowerCase() : ''

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {name ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </div>
      {roleLabel && (
        <div className="self-start sm:self-auto flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">{roleLabel}</span>
        </div>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number
  max: number
  color?: string
  className?: string
}

export function ProgressBar({ value, max, color = 'bg-primary', className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cn('w-full rounded-full bg-muted h-2 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70">{description}</p>
      )}
    </div>
  )
}
