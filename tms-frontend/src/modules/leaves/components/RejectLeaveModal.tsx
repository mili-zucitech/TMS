import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MessageSquareX } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { cn } from '@/utils/cn'
import type { LeaveRequestResponse } from '../types/leave.types'

// ── Schema ────────────────────────────────────────────────────

const schema = z.object({
  rejectionReason: z
    .string()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(500),
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────

interface RejectLeaveModalProps {
  open: boolean
  leave: LeaveRequestResponse | null
  onClose: () => void
  onSubmit: (id: number, rejectionReason: string) => Promise<void>
  isLoading?: boolean
}

// ── Component ────────────────────────────────────────────────

export function RejectLeaveModal({
  open,
  leave,
  onClose,
  onSubmit,
  isLoading,
}: RejectLeaveModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rejectionReason: '' },
  })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const handleFormSubmit = handleSubmit(async ({ rejectionReason }) => {
    if (!leave) return
    await onSubmit(leave.id, rejectionReason)
    onClose()
  })

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <MessageSquareX className="h-5 w-5" />
            Reject Leave Request
          </DialogTitle>
          <DialogDescription>
            {leave
              ? `Rejecting ${leave.leaveTypeName} request (${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)}, ${leave.totalDays}d). A reason is required.`
              : 'Provide a reason for rejecting this leave request.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="reject-reason"
              rows={4}
              placeholder="Explain the reason for rejection…"
              className={cn(
                'flex w-full rounded-lg border bg-background px-3 py-2 text-sm',
                'ring-offset-background placeholder:text-muted-foreground resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                errors.rejectionReason
                  ? 'border-destructive focus-visible:ring-destructive'
                  : 'border-input hover:border-muted-foreground/50',
              )}
              {...register('rejectionReason')}
            />
            {errors.rejectionReason && (
              <p className="text-xs text-destructive">{errors.rejectionReason.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={isLoading}>
              Reject Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
