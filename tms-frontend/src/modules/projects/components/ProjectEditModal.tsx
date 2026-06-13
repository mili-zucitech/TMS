import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FolderEdit } from 'lucide-react'

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
import type { ProjectResponse, ProjectUpdateRequest, ProjectStatus } from '../types/project.types'

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

interface ProjectEditModalProps {
  project: ProjectResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (id: number, data: ProjectUpdateRequest) => Promise<boolean>
  departments?: { id: number; name: string }[]
  managers?: { id: string; name: string; employeeId: string }[]
}

// ── Shared styles ─────────────────────────────────────────────

const fieldClass = 'space-y-1.5'
const errorClass = 'text-xs text-destructive mt-1'

// ── Component ─────────────────────────────────────────────────

export function ProjectEditModal({ project, open, onOpenChange, onSubmit, departments = [], managers = [] }: ProjectEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Prefill when project changes
  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description ?? '',
        clientName: project.clientName ?? '',
        projectManagerId: project.projectManagerId ?? '',
        departmentId: project.departmentId ?? '',
        startDate: project.startDate ?? '',
        endDate: project.endDate ?? '',
        status: project.status,
      })
    }
  }, [project, reset])

  const handleFormSubmit = async (values: FormValues) => {
    if (!project) return
    const payload: ProjectUpdateRequest = {
      name: values.name,
      ...(values.description !== undefined ? { description: values.description || undefined } : {}),
      ...(values.clientName !== undefined ? { clientName: values.clientName || undefined } : {}),
      ...(values.projectManagerId
        ? { projectManagerId: values.projectManagerId }
        : { projectManagerId: undefined }),
      ...(values.startDate ? { startDate: values.startDate } : {}),
      ...(values.endDate ? { endDate: values.endDate } : {}),
      ...(values.status ? { status: values.status as ProjectStatus } : {}),
      ...(typeof values.departmentId === 'number' ? { departmentId: values.departmentId } : {}),
    }
    const ok = await onSubmit(project.id, payload)
    if (ok) {
      onOpenChange(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 mb-1">
            <FolderEdit className="h-5 w-5 text-white" />
          </div>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the details for{' '}
            <span className="font-mono font-semibold text-foreground">{project.projectCode}</span>
            {' – '}
            {project.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Project Name */}
            <div className={`${fieldClass} sm:col-span-2`}>
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                placeholder="Customer Portal Redesign"
                error={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            {/* Client Name */}
            <div className={fieldClass}>
              <Label htmlFor="edit-clientName">Client Name</Label>
              <Input
                id="edit-clientName"
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
              <Label htmlFor="edit-status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    inputId="edit-status"
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
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
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
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                error={!!errors.endDate}
                {...register('endDate')}
              />
              {errors.endDate && <p className={errorClass}>{errors.endDate.message}</p>}
            </div>

            {/* Project Manager */}
            <div className={fieldClass}>
              <Label htmlFor="edit-projectManagerId">Project Manager</Label>
              <Controller
                name="projectManagerId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    inputId="edit-projectManagerId"
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
              <Label htmlFor="edit-departmentId">Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    inputId="edit-departmentId"
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
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-2"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
