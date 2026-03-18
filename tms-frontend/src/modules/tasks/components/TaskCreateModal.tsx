import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ListTodo } from 'lucide-react'

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
import type { TaskCreateRequest, TaskPriority, TaskStatus } from '../types/task.types'
import projectService from '@/modules/projects/services/projectService'
import { MultiSelectMembers, type MemberOption } from './MultiSelectMembers'

//  Zod schema 
const schema = z
  .object({
    title: z.string().min(1, 'Task name is required').max(200, 'Max 200 characters'),
    description: z.string().max(2000, 'Max 2000 characters').optional().or(z.literal('')),
    projectId: z.coerce.number({ invalid_type_error: 'Project is required' }).positive('Select a project'),
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
interface TaskCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    base: Omit<TaskCreateRequest, 'assignedUserId'>,
    selectedUserIds: string[],
  ) => Promise<boolean>
  projects: { id: number; name: string }[]
  users: { id: string; name: string }[]
}

//  Shared styles 
const fieldClass = 'space-y-1.5'
const errorClass = 'text-xs text-destructive mt-1'
const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors disabled:opacity-50'

//  Component 
export function TaskCreateModal({
  open,
  onOpenChange,
  onSubmit,
  projects,
  users,
}: TaskCreateModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      projectId: '' as unknown as number,
      priority: 'MEDIUM',
      status: 'TODO',
      estimatedHours: '' as unknown as number,
      startDate: '',
      dueDate: '',
    },
  })

  //  Watch project selection 
  const watchedProjectId = useWatch({ control, name: 'projectId' })

  //  Project member state 
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([])

  useEffect(() => {
    const pid = Number(watchedProjectId)
    if (!pid || isNaN(pid)) {
      setMemberIds([])
      setSelectedMembers([])
      return
    }
    setLoadingMembers(true)
    setSelectedMembers([])
    projectService
      .getAssignmentsByProject(pid)
      .then((assignments) => setMemberIds(assignments.map((a) => a.userId)))
      .catch(() => setMemberIds([]))
      .finally(() => setLoadingMembers(false))
  }, [watchedProjectId])

  // Resolve member options from the full users list
  const memberOptions: MemberOption[] = useMemo(
    () =>
      users
        .filter((u) => memberIds.includes(u.id))
        .map((u) => ({ value: u.id, label: u.name })),
    [users, memberIds],
  )

  const projectSelected = Number(watchedProjectId) > 0

  // Assigned-members validation error
  const [membersError, setMembersError] = useState<string | null>(null)

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      reset()
      setSelectedMembers([])
      setMemberIds([])
      setMembersError(null)
    }
  }, [open, reset])

  const handleFormSubmit = async (values: FormValues) => {
    if (selectedMembers.length === 0) {
      setMembersError('At least one member must be assigned')
      return
    }
    const base: Omit<TaskCreateRequest, 'assignedUserId'> = {
      title: values.title,
      projectId: values.projectId as number,
      ...(values.description && { description: values.description }),
      ...(values.priority ? { priority: values.priority as TaskPriority } : {}),
      ...(values.status ? { status: values.status as TaskStatus } : {}),
      ...(typeof values.estimatedHours === 'number'
        ? { estimatedHours: values.estimatedHours }
        : {}),
      ...(values.startDate && { startDate: values.startDate }),
      ...(values.dueDate && { dueDate: values.dueDate }),
    }
    const ok = await onSubmit(base, selectedMembers.map((m) => m.value))
    if (ok) {
      reset()
      setSelectedMembers([])
      setMemberIds([])
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 mb-1">
            <ListTodo className="h-5 w-5 text-white" />
          </div>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">

            {/* Task Code — auto-generated */}
            <div className={fieldClass}>
              <Label>Task Code</Label>
              <div className="flex h-10 w-full items-center rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground select-none">
                Auto-generated (e.g. TSK-0001)
              </div>
            </div>

            {/* Task Name */}
            <div className={fieldClass}>
              <Label htmlFor="title">Task Name *</Label>
              <Input
                id="title"
                placeholder="Implement login feature"
                error={!!errors.title}
                {...register('title')}
              />
              {errors.title && <p className={errorClass}>{errors.title.message}</p>}
            </div>

            {/* Project */}
            <div className={fieldClass}>
              <Label htmlFor="projectId">Project *</Label>
              <select id="projectId" className={selectClass} {...register('projectId')}>
                <option value="">— Select project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && <p className={errorClass}>{errors.projectId.message}</p>}
            </div>

            {/* Assigned Members — react-select multi */}
            <div className={fieldClass}>
              <div className="flex items-center gap-2 mt-2.5">
                <Label>Assigned Members *</Label>
                {selectedMembers.length > 1 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {selectedMembers.length} selected · creates {selectedMembers.length} tasks
                  </span>
                )}
              </div>
              <MultiSelectMembers
                options={memberOptions}
                value={selectedMembers}
                onChange={(val) => { setSelectedMembers(val); if (val.length > 0) setMembersError(null) }}
                isLoading={loadingMembers}
                isDisabled={!projectSelected}
                placeholder={!projectSelected ? 'Select a project first…' : '— Select members —'}
              />
              {membersError && <p className={errorClass}>{membersError}</p>}
            </div>

            {/* Priority */}
            <div className={fieldClass}>
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" className={selectClass} {...register('priority')}>
                <option value="">— Select priority —</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Status */}
            <div className={fieldClass}>
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectClass} {...register('status')}>
                <option value="">— Select status —</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            {/* Estimated Hours */}
            <div className={fieldClass}>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0.01"
                step="0.5"
                placeholder="8"
                error={!!errors.estimatedHours}
                {...register('estimatedHours')}
              />
              {errors.estimatedHours && (
                <p className={errorClass}>{errors.estimatedHours.message}</p>
              )}
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
            </div>

            {/* Due Date */}
            <div className={fieldClass}>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                error={!!errors.dueDate}
                {...register('dueDate')}
              />
              {errors.dueDate && <p className={errorClass}>{errors.dueDate.message}</p>}
            </div>

            {/* Description — full-width */}
            <div className={`${fieldClass} sm:col-span-2`}>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="Describe the task"
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
              {selectedMembers.length > 1
                ? `Create ${selectedMembers.length} Tasks`
                : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}