import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarDays } from 'lucide-react'

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
import type { HolidayResponse, HolidayUpdateRequest } from '../types/holiday.types'
import { HOLIDAY_TYPES, HOLIDAY_TYPE_CONFIG } from './holidayConfig'

// ── Zod Schema ────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Holiday name is required').max(100),
  description: z.string().max(500).optional(),
  holidayDate: z.string().min(1, 'Date is required'),
  type: z.enum(['NATIONAL', 'COMPANY', 'REGIONAL']),
  isOptional: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────

interface HolidayEditModalProps {
  open: boolean
  holiday: HolidayResponse | null
  onClose: () => void
  onSubmit: (id: number, data: HolidayUpdateRequest) => Promise<void>
  isLoading?: boolean
}

// ── Component ────────────────────────────────────────────────

export function HolidayEditModal({
  open,
  holiday,
  onClose,
  onSubmit,
  isLoading,
}: HolidayEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      holidayDate: '',
      type: 'NATIONAL',
      isOptional: false,
    },
  })

  // Populate form when a holiday is selected
  useEffect(() => {
    if (holiday) {
      reset({
        name: holiday.name,
        description: holiday.description ?? '',
        holidayDate: holiday.holidayDate,
        type: holiday.type,
        isOptional: holiday.isOptional,
      })
    }
  }, [holiday, reset])

  const selectedType = watch('type')

  const handleFormSubmit = handleSubmit(async (values) => {
    if (!holiday) return
    await onSubmit(holiday.id, {
      name: values.name,
      description: values.description || undefined,
      holidayDate: values.holidayDate,
      type: values.type,
      isOptional: values.isOptional,
    })
    onClose()
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Edit Holiday
          </DialogTitle>
          <DialogDescription>
            Update the details of this holiday.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">
              Holiday Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="e.g. Christmas Day"
              error={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-date"
              type="date"
              error={!!errors.holidayDate}
              {...register('holidayDate')}
            />
            {errors.holidayDate && (
              <p className="text-xs text-destructive">{errors.holidayDate.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-2 flex-wrap">
              {HOLIDAY_TYPES.map((t) => {
                const cfg = HOLIDAY_TYPE_CONFIG[t]
                const active = selectedType === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue('type', t)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      active
                        ? cfg.badgeClass + ' ring-2 ring-offset-1'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50 bg-background',
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <textarea
              id="edit-desc"
              rows={3}
              placeholder="Optional description…"
              className={cn(
                'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background placeholder:text-muted-foreground resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.description ? 'border-destructive' : 'hover:border-muted-foreground/50',
              )}
              {...register('description')}
            />
          </div>

          {/* Optional checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              {...register('isOptional')}
            />
            <span className="text-sm text-muted-foreground">
              Mark as optional holiday
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
