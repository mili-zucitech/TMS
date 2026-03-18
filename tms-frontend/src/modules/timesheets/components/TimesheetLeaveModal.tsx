import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarRange, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { cn } from '@/utils/cn'
import { applyLeave } from '@/modules/leaves/services/leaveService'
import type {
  LeaveTypeResponse,
  LeaveBalanceResponse,
  LeaveRequestResponse,
} from '@/modules/leaves/types/leave.types'
import { formatShortDate } from '../utils/timesheetHelpers'

// ── Schema ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDatesInRange(start: string, end: string): string[] {
  if (!start || !end || end < start) return []
  const result: string[] = []
  const d = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  while (d <= e) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    result.push(`${y}-${m}-${dd}`)
    d.setDate(d.getDate() + 1)
  }
  return result
}

function calcDays(start: string, end: string): number {
  return getDatesInRange(start, end).length
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimesheetLeaveModalProps {
  open: boolean
  /** Pre-filled start date (the day the user clicked "Apply Leave" on) */
  defaultDate: string
  userId: string
  leaveTypes: LeaveTypeResponse[]
  balances: LeaveBalanceResponse[]
  /** All leave requests for the user — used for overlap detection */
  existingLeaves: LeaveRequestResponse[]
  /** Set of work-dates that have time entries — used for conflict detection */
  datesWithEntries: Set<string>
  onClose: () => void
  onSuccess: (leave: LeaveRequestResponse) => void
  /** Called to bulk-delete entries on the given dates before submitting leave */
  onDeleteEntriesForDates: (dates: string[]) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimesheetLeaveModal({
  open,
  defaultDate,
  userId,
  leaveTypes,
  balances,
  existingLeaves,
  datesWithEntries,
  onClose,
  onSuccess,
  onDeleteEntriesForDates,
}: TimesheetLeaveModalProps) {
  // 'form' = main form  |  'conflict' = confirmation step when entries exist
  const [step, setStep] = useState<'form' | 'conflict'>('form')
  const [conflictDates, setConflictDates] = useState<string[]>([])
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      leaveTypeId: '',
      startDate: defaultDate,
      endDate: defaultDate,
      reason: '',
    },
  })

  // Re-initialise form whenever the modal opens or the pre-filled date changes
  useEffect(() => {
    if (open) {
      reset({
        leaveTypeId: leaveTypes[0] ? String(leaveTypes[0].id) : '',
        startDate: defaultDate,
        endDate: defaultDate,
        reason: '',
      })
      setStep('form')
      setConflictDates([])
      setPendingValues(null)
    }
  }, [open, defaultDate, reset, leaveTypes])

  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const selectedTypeId = watch('leaveTypeId')
  const days = calcDays(startDate, endDate)

  const selectedBalance = selectedTypeId
    ? balances.find((b) => b.leaveTypeId === Number(selectedTypeId))
    : undefined

  const isOverAllocation =
    days > 0 && selectedBalance != null && days > selectedBalance.remainingLeaves

  // Check whether the chosen date range overlaps with an existing non-cancelled leave
  const hasLeaveOverlap = useMemo(() => {
    if (!startDate || !endDate) return false
    return existingLeaves.some(
      (l) =>
        l.status !== 'CANCELLED' &&
        l.status !== 'REJECTED' &&
        l.startDate <= endDate &&
        l.endDate >= startDate,
    )
  }, [existingLeaves, startDate, endDate])

  // Submit the leave via the API
  const doSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const leave = await applyLeave({
        userId,
        leaveTypeId: Number(values.leaveTypeId),
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || undefined,
      })
      toast.success('Leave applied successfully')
      onSuccess(leave)
    } catch {
      toast.error('Failed to apply leave')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Called when the main form is submitted
  const onFormSubmit = handleSubmit(async (values) => {
    if (hasLeaveOverlap) {
      toast.error('You already have a leave request overlapping these dates')
      return
    }
    // Check whether any day in the range already has time entries
    const conflicts = getDatesInRange(values.startDate, values.endDate).filter((d) =>
      datesWithEntries.has(d),
    )
    if (conflicts.length > 0) {
      setConflictDates(conflicts)
      setPendingValues(values)
      setStep('conflict')
      return
    }
    await doSubmit(values)
  })

  // Called when the user confirms "Proceed and clear entries"
  const handleProceedClear = async () => {
    if (!pendingValues) return
    setIsSubmitting(true)
    try {
      await onDeleteEntriesForDates(conflictDates)
      await doSubmit(pendingValues)
    } catch {
      toast.error('Failed to clear entries — please try again')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Apply Leave
          </DialogTitle>
          {step === 'form' && (
            <DialogDescription>
              Apply leave starting {formatShortDate(defaultDate)}.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Conflict confirmation step ──────────────────────────────────── */}
        {step === 'conflict' && pendingValues && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Timesheet entries exist</p>
                <p>
                  You have timesheet entries on{' '}
                  <span className="font-medium">
                    {conflictDates.map(formatShortDate).join(', ')}
                  </span>
                  . Applying leave will remove all entries on{' '}
                  {conflictDates.length === 1 ? 'that day' : 'those days'}.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('form')
                  setConflictDates([])
                  setPendingValues(null)
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedClear}
                loading={isSubmitting}
              >
                Proceed and Clear Entries
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Main form ────────────────────────────────────────────────────── */}
        {step === 'form' && (
          <form onSubmit={onFormSubmit} className="space-y-4 mt-2">
            {/* Leave overlap warning */}
            {hasLeaveOverlap && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                You already have a leave request for this period.
              </div>
            )}

            {/* Leave type */}
            <div className="space-y-1.5">
              <Label htmlFor="ts-leave-type">
                Leave Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="ts-leave-type"
                className={cn(
                  'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  errors.leaveTypeId
                    ? 'border-destructive'
                    : 'border-input hover:border-muted-foreground/50',
                )}
                {...register('leaveTypeId')}
              >
                <option value="">Select leave type…</option>
                {leaveTypes.map((t) => {
                  const bal = balances.find((b) => b.leaveTypeId === t.id)
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {bal?.remainingLeaves != null ? ` — ${bal.remainingLeaves} days left` : ''}
                    </option>
                  )
                })}
              </select>
              {errors.leaveTypeId && (
                <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>
              )}
              {/* Remaining balance pill */}
              {selectedBalance && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                    selectedBalance.remainingLeaves === 0
                      ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                      : 'bg-muted border border-border text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full flex-shrink-0',
                      selectedBalance.remainingLeaves === 0 ? 'bg-destructive' : 'bg-emerald-500',
                    )}
                  />
                  <span>
                    <span className="font-semibold text-foreground">
                      {selectedBalance.remainingLeaves}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-foreground">
                      {selectedBalance.totalAllocated}
                    </span>{' '}
                    days remaining ({selectedBalance.usedLeaves} used)
                  </span>
                </div>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ts-leave-start">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ts-leave-start"
                  type="date"
                  error={!!errors.startDate}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-leave-end">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ts-leave-end"
                  type="date"
                  error={!!errors.endDate}
                  min={startDate}
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-xs text-destructive">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Duration + over-allocation indicator */}
            {days > 0 && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm border',
                  isOverAllocation
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-primary/5 border-primary/20',
                )}
              >
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
                      — exceeds your {selectedBalance.remainingLeaves} remaining day
                      {selectedBalance.remainingLeaves !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Optional reason */}
            <div className="space-y-1.5">
              <Label htmlFor="ts-leave-reason">Reason</Label>
              <textarea
                id="ts-leave-reason"
                rows={3}
                placeholder="Optional reason for your leave…"
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
              <Button type="submit" loading={isSubmitting} disabled={hasLeaveOverlap}>
                Apply Leave
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
