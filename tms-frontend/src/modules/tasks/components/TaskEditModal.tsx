import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'
import Select, { type StylesConfig } from 'react-select'

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
import type { TaskResponse, TaskUpdateRequest, TaskPriority, TaskStatus } from '../types/task.types'
import projectService from '@/modules/projects/services/projectService'

//  Single-select member option 
interface MemberOption { value: string; label: string }

function buildSelectStyles(): StylesConfig<MemberOption, false> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: '2.5rem',
      borderRadius: '0.5rem',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.3)' : 'none',
      backgroundColor: 'hsl(var(--background))',
      '&:hover': { borderColor: 'hsl(var(--ring))' },
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 16px hsl(var(--foreground) / 0.08)',
      zIndex: 9999,
    }),
    menuList: (base) => ({ ...base, padding: 0, maxHeight: '200px' }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      color: 'hsl(var(--foreground))',
      backgroundColor: state.isFocused
        ? 'hsl(var(--accent))'
        : state.isSelected
        ? 'hsl(var(--accent))'
        : 'transparent',
      cursor: 'pointer',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    input: (base) => ({ ...base, color: 'hsl(var(--foreground))', fontSize: '0.875rem' }),
  }
}

//  Zod schema 
const schema = z
  .object({
    title: z.string().min(1, 'Task name is required').max(200, 'Max 200 characters'),
    description: z.string().max(2000, 'Max 2000 characters').optional().or(z.literal('')),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).optional().or(z.literal('')),
    status: z
      .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED'] as const)
      .optional()
      .or(z.literal('')),
    estimatedHours: z.coerce.number().positive('Must be positive').optional().or(z.literal('')),
    startDate: z.string().optional().or(z.literal('')),
    dueDate: z.string().optional().or(z.literal('')),
  })
  .refine(
    (d) => {
      if (d.startDate && d.dueDate) return d.dueDate >= d.startDate
      return true
    },
    { message: 'Due date must be on or after start date', path: ['dueDate'] },
  )

type FormValues = z.infer<typeof schema>

//  Props 
interface TaskEditModalProps {
  task: TaskResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (id: number, data: TaskUpdateRequest) => Promise<boolean>
  users: { id: string; name: string }[]
}

//  Shared styles 
const fieldClass = 'space-y-1.5'
const errorClass = 'text-xs text-destructive mt-1'
const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors disabled:opacity-50'

const reactSelectStyles = buildSelectStyles()

//  Component 
export function TaskEditModal({
  task,
  open,
  onOpenChange,
  onSubmit,
  users,
}: TaskEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  //  Project member state 
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)

  // Fetch members whenever the task's project changes
  useEffect(() => {
    if (!task?.projectId) { setMemberIds([]); return }
    setLoadingMembers(true)
    projectService
      .getAssignmentsByProject(task.projectId)
      .then((a) => setMemberIds(a.map((x) => x.userId)))
      .catch(() => setMemberIds([]))
      .finally(() => setLoadingMembers(false))
  }, [task?.projectId])

  const memberOptions: MemberOption[] = useMemo(
    () =>
      users
        .filter((u) => memberIds.includes(u.id))
        .map((u) => ({ value: u.id, label: u.name })),
    [users, memberIds],
  )

  // Prefill form + selectedMember when task changes
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        status: task.status,
        estimatedHours: task.estimatedHours ?? ('' as unknown as number),
        startDate: task.startDate ?? '',
        dueDate: task.dueDate ?? '',
      })
      const existing = users.find((u) => u.id === task.assignedUserId)
      setSelectedMember(existing ? { value: existing.id, label: existing.name } : null)
    }
  }, [task, reset, users])

  const handleFormSubmit = async (values: FormValues) => {
    if (!task) return
    const payload: TaskUpdateRequest = {
      title: values.title,
      ...(values.description !== undefined ? { description: values.description || undefined } : {}),
      assignedUserId: selectedMember?.value ?? undefined,
      ...(values.priority ? { priority: values.priority as TaskPriority } : {}),
      ...(values.status ? { status: values.status as TaskStatus } : {}),
      ...(typeof values.estimatedHours === 'number' ? { estimatedHours: values.estimatedHours } : {}),
      ...(values.startDate ? { startDate: values.startDate } : {}),
      ...(values.dueDate ? { dueDate: values.dueDate } : {}),
    }
    const ok = await onSubmit(task.id, payload)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 mb-1">
            <Pencil className="h-5 w-5 text-white" />
          </div>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details.{' '}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {task?.taskCode}
            </span>{' '}
            — Project and task code cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">

            {/* Task Name */}
            <div className={`${fieldClass} sm:col-span-2`}>
              <Label htmlFor="edit-title">Task Name *</Label>
              <Input
                id="edit-title"
                error={!!errors.title}
                {...register('title')}
              />
              {errors.title && <p className={errorClass}>{errors.title.message}</p>}
            </div>

            {/* Assigned Employee — project-filtered single select */}
            <div className={fieldClass}>
              <Label>Assigned Employee</Label>
              <Select<MemberOption, false>
                options={memberOptions}
                value={selectedMember}
                onChange={(opt) => setSelectedMember(opt ?? null)}
                isLoading={loadingMembers}
                isClearable
                placeholder="— Unassigned —"
                styles={reactSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>

            {/* Status */}
            <div className={fieldClass}>
              <Label htmlFor="edit-status">Status</Label>
              <select id="edit-status" className={selectClass} {...register('status')}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            {/* Priority */}
            <div className={fieldClass}>
              <Label htmlFor="edit-priority">Priority</Label>
              <select id="edit-priority" className={selectClass} {...register('priority')}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Estimated Hours */}
            <div className={fieldClass}>
              <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
              <Input
                id="edit-estimatedHours"
                type="number"
                min="0.01"
                step="0.5"
                error={!!errors.estimatedHours}
                {...register('estimatedHours')}
              />
              {errors.estimatedHours && (
                <p className={errorClass}>{errors.estimatedHours.message}</p>
              )}
            </div>

            {/* Start Date */}
            <div className={fieldClass}>
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input id="edit-startDate" type="date" {...register('startDate')} />
            </div>

            {/* Due Date */}
            <div className={fieldClass}>
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <Input
                id="edit-dueDate"
                type="date"
                error={!!errors.dueDate}
                {...register('dueDate')}
              />
              {errors.dueDate && <p className={errorClass}>{errors.dueDate.message}</p>}
            </div>

            {/* Description */}
            <div className={`${fieldClass} sm:col-span-2`}>
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                rows={3}
                className={`${selectClass} resize-none h-auto`}
                {...register('description')}
              />
              {errors.description && (
                <p className={errorClass}>{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
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
              loading={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}