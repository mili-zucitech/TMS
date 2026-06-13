import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FolderPlus } from 'lucide-react'

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
import { AppSelect } from '@/components/ui/Select'
import type { ProjectCreateRequest, ProjectStatus } from '../types/project.types'

// ── Zod schema ────────────────────────────────────────────────

const schema = z
  .object({
    name: z
      .string()
      .min(1, 'Project name is required')
      .max(150, 'Max 150 characters'),
    description: z.string().max(1000, 'Max 1000 characters').optional().or(z.literal('')),
    clientName: z.string().max(150, 'Max 150 characters').optional().or(z.literal('')),
    projectManagerId: z.string().optional().or(z.literal('')),
    departmentId: z.coerce.number().positive('Must be positive').optional().or(z.literal('')),
    startDate: z.string().optional().or(z.literal('')),
    endDate: z.string().optional().or(z.literal('')),
    status: z
      .enum(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const)
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate
      }
      return true
    },
    { message: 'End date must be after start date', path: ['endDate'] },
  )

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────

interface ProjectCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectCreateRequest) => Promise<boolean>
  departments?: { id: number; name: string }[]
  managers?: { id: string; name: string; employeeId: string }[]
}

// ── Shared styles ─────────────────────────────────────────────

const fieldClass = 'space-y-1.5'
const errorClass = 'text-xs text-destructive mt-1'

// ── Component ─────────────────────────────────────────────────

export function ProjectCreateModal({ open, onOpenChange, onSubmit, departments = [], managers = [] }: ProjectCreateModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      clientName: '',
      projectManagerId: '',
      departmentId: '',
      startDate: '',
      endDate: '',
      status: 'PLANNED',
    },
  })

  const handleFormSubmit = async (values: FormValues) => {
    const payload: ProjectCreateRequest = {
      name: values.name,
      ...(values.description && { description: values.description }),
      ...(values.clientName && { clientName: values.clientName }),
      ...(values.projectManagerId && { projectManagerId: values.projectManagerId }),
      ...(values.startDate && { startDate: values.startDate }),
      ...(values.endDate && { endDate: values.endDate }),
      ...(values.status ? { status: values.status as ProjectStatus } : {}),
      ...(typeof values.departmentId === 'number' ? { departmentId: values.departmentId } : {}),
    }
    const ok = await onSubmit(payload)
    if (ok) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 mb-1">
            <FolderPlus className="h-5 w-5 text-white" />
          </div>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Project Code — auto-generated */}
            <div className={fieldClass}>
              <Label>Project Code</Label>
              <div className="flex h-10 w-full items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground select-none">
                Auto-generated (e.g. PRJ-0001)
              </div>
            </div>

            {/* Project Name */}
            <div className={fieldClass}>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="Customer Portal Redesign"
                error={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            {/* Client Name */}
            <div className={fieldClass}>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="Acme Corp"
                error={!!errors.clientName}
                {...register('clientName')}
              />
              {errors.clientName && (
                <p className={errorClass}>{errors.clientName.message}</p>
              )}
            </div>

            {/* Status */}
            <div className={fieldClass}>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    inputId="status"
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                    error={!!errors.status}
                    isSearchable={false}
                    options={[
                      { value: '', label: '— Select status —' },
                      { value: 'PLANNED', label: 'Planned' },
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'ON_HOLD', label: 'On Hold' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'CANCELLED', label: 'Cancelled' },
                    ]}
                  />
                )}
              />
              {errors.status && <p className={errorClass}>{errors.status.message}</p>}
            </div>

            {/* Start Date */}
            <div className={fieldClass}>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                error={!!errors.startDate}
                {...register('startDate')}
              />
              {errors.startDate && (
                <p className={errorClass}>{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className={fieldClass}>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                error={!!errors.endDate}
                {...register('endDate')}
              />
              {errors.endDate && <p className={errorClass}>{errors.endDate.message}</p>}
            </div>

            {/* Project Manager */}
            <div className={fieldClass}>
              <Label htmlFor="projectManagerId">Project Manager</Label>
              <Controller
                name="projectManagerId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    inputId="projectManagerId"
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(String(v))}
                    error={!!errors.projectManagerId}
                    options={[
                      { value: '', label: '— Select manager —' },
                      ...managers.map((m) => ({ value: m.id, label: `${m.name} (${m.employeeId})` })),
                    ]}
                  />
                )}
              />
              {errors.projectManagerId && (
                <p className={errorClass}>{errors.projectManagerId.message}</p>
              )}
            </div>

            {/* Department */}
            <div className={fieldClass}>
              <Label htmlFor="departmentId">Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    inputId="departmentId"
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                    error={!!errors.departmentId}
                    options={[
                      { value: '', label: '— Select department —' },
                      ...departments.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                )}
              />
              {errors.departmentId && (
                <p className={errorClass}>{errors.departmentId.message}</p>
              )}
            </div>

            {/* Description (full width) */}
            <div className={`${fieldClass} sm:col-span-2`}>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief project overview…"
                className={
                  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
                  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
                  'focus:ring-offset-1 transition-colors resize-none disabled:opacity-50 ' +
                  (errors.description ? 'border-destructive' : '')
                }
                {...register('description')}
              />
              {errors.description && (
                <p className={errorClass}>{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-2"
            >
              {isSubmitting ? 'Creating…' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
