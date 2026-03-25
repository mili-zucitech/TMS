import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarRange, AlertTriangle, CheckCircle2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { cn } from '@/utils/cn'
import type { LeaveBalanceResponse, LeaveTypeResponse } from '../types/leave.types'

// â”€â”€ Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const schema = z
  .object({
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().max(1000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })

type FormValues = z.infer<typeof schema>

// â”€â”€ Days calculator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function calcDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0
  const s = new Date(start)
  const e = new Date(end)
  return Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1
}

// â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ApplyLeaveModalProps {
  open: boolean
  userId: string
  leaveTypes: LeaveTypeResponse[]
  balances: LeaveBalanceResponse[]
  onClose: () => void
  onSubmit: (payload: {
    userId: string
    leaveTypeId: number
    startDate: string
    endDate: string
    reason?: string
  }) => Promise<void>
  isLoading?: boolean
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ApplyLeaveModal({
  open,
  userId,
  leaveTypes,
  balances,
  onClose,
  onSubmit,
  isLoading,
}: ApplyLeaveModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaveTypeId: '', startDate: '', endDate: '', reason: '' },
  })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const selectedTypeId = watch('leaveTypeId')
  const days = calcDays(startDate, endDate)

  // Find the balance for the currently selected leave type
  const selectedBalance = selectedTypeId
    ? balances.find((b) => b.leaveTypeId === Number(selectedTypeId))
    : undefined

  const isOverAllocation =
    days > 0 && selectedBalance != null && days > selectedBalance.remainingLeaves

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit({
      userId,
      leaveTypeId: Number(values.leaveTypeId),
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason || undefined,
    })
    onClose()
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Apply for Leave
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to submit your leave request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label htmlFor="apply-type">
              Leave Type <span className="text-destructive">*</span>
            </Label>
            <select
              id="apply-type"
              className={cn(
                'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.leaveTypeId ? 'border-destructive' : 'border-input hover:border-muted-foreground/50',
              )}
              {...register('leaveTypeId')}
            >
              <option value="">Select leave type...</option>
              {leaveTypes.map((t) => {
                const bal = balances.find((b) => b.leaveTypeId === t.id)
                const remaining = bal?.remainingLeaves
                return (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {remaining != null ? ` \u2014 ${remaining} days left` : ''}
                  </option>
                )
              })}
            </select>
            {errors.leaveTypeId && (
              <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>
            )}
            {/* Remaining balance pill */}
            {selectedBalance && (
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                selectedBalance.remainingLeaves === 0
                  ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                  : 'bg-muted border border-border text-muted-foreground',
              )}>
                <span className={cn(
                  'h-2 w-2 rounded-full flex-shrink-0',
                  selectedBalance.remainingLeaves === 0 ? 'bg-destructive' : 'bg-emerald-500',
                )} />
                <span>
                  <span className="font-semibold text-foreground">{selectedBalance.remainingLeaves}</span>
                  {' '}of{' '}
                  <span className="font-semibold text-foreground">{selectedBalance.totalAllocated}</span>
                  {' '}days remaining
                  {selectedBalance.usedLeaves > 0 && (
                    <span className="ml-1 opacity-70">({selectedBalance.usedLeaves} used)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="apply-start">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apply-start"
                type="date"
                error={!!errors.startDate}
                {...register('startDate')}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-end">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apply-end"
                type="date"
                error={!!errors.endDate}
                {...register('endDate')}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Duration + balance feedback */}
          {days > 0 && (
            <div className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm border',
              isOverAllocation
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                : 'bg-primary/5 border-primary/20',
            )}>
              {isOverAllocation ? (
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              )}
              <span>
                <span className="font-semibold">{days}</span>{' '}
                day{days !== 1 ? 's' : ''} requested
                {isOverAllocation && selectedBalance && (
                  <span className="ml-1 font-medium">
                    â€” exceeds your {selectedBalance.remainingLeaves} remaining day{selectedBalance.remainingLeaves !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="apply-reason">Reason</Label>
            <textarea
              id="apply-reason"
              rows={3}
              placeholder="Optional reason for your leave"
              className={cn(
                'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background placeholder:text-muted-foreground resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'hover:border-muted-foreground/50',
              )}
              {...register('reason')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

