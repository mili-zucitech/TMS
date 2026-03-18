import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-secondary text-secondary-foreground border border-border',
        success:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20',
        warning:
          'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
        info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
        outline: 'border border-border text-foreground',
        violet:
          'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }

