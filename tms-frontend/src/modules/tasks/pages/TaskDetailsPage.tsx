import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  RefreshCw,
  AlertCircle,
  User,
  FolderOpen,
  Clock,
  ClipboardList,
  Loader2,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import taskService from '../services/taskService'
import projectService from '@/modules/projects/services/projectService'
import userModuleService from '@/modules/users/services/userService'
import { TaskStatusBadge, statusMap, ALL_STATUSES } from '../components/TaskStatusBadge'
import { TaskPriorityBadge } from '../components/TaskPriorityBadge'
import { TaskEditModal } from '../components/TaskEditModal'
import type { TaskResponse, TaskStatus, TaskUpdateRequest } from '../types/task.types'
import type { ProjectResponse } from '@/modules/projects/types/project.types'
import type { UserResponse } from '@/modules/users/types/user.types'
import type { ApiResponse } from '@/types/api.types'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getDaysUntilDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
}

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

const STATUS_FLOW: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="text-xs font-medium text-right">{value}</div>
    </div>
  )
}

export default function TaskDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [task, setTask] = useState<TaskResponse | null>(null)
  const [project, setProject] = useState<ProjectResponse | null>(null)
  const [allUsers, setAllUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const canModify =
    authUser?.roleName === 'ADMIN' ||
    authUser?.roleName === 'HR_MANAGER' ||
    authUser?.roleName === 'MANAGER' ||
    authUser?.roleName === 'HR' ||
    authUser?.roleName === 'DIRECTOR'

  const canUpdateStatus = authUser?.roleName === 'EMPLOYEE'

  const taskId = id ? parseInt(id, 10) : null

  const loadData = async () => {
    if (!taskId || isNaN(taskId)) {
      setError('Invalid task ID')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [taskData, usersPage] = await Promise.all([
        taskService.getTaskById(taskId),
        userModuleService.getUsers(0, 500).catch(() => ({ content: [] as UserResponse[] })),
      ])
      setTask(taskData)
      setAllUsers(usersPage.content)
      try {
        const proj = await projectService.getProjectById(taskData.projectId)
        setProject(proj)
      } catch {
        // non-critical
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load task details'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  const handleUpdateSubmit = async (id: number, data: TaskUpdateRequest): Promise<boolean> => {
    try {
      const updated = await taskService.updateTask(id, data)
      setTask(updated)
      toast.success('Task updated successfully')
      return true
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task'))
      return false
    }
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || newStatus === task.status) return
    setIsUpdatingStatus(true)
    try {
      const updated = await taskService.updateTaskStatus(task.id, { status: newStatus })
      setTask(updated)
      toast.success('Status updated')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-6 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-40" />
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-xl bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-2/3 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="mb-6 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-4 text-sm text-destructive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error ?? 'Task not found'}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              onClick={() => void loadData()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const assignedUser = task.assignedUserId
    ? allUsers.find((u) => u.id === task.assignedUserId) ?? null
    : null

  const isOverdue =
    !!task.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date()
  const daysUntilDue = getDaysUntilDue(task.dueDate)
  const isDueSoon =
    daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3 && task.status !== 'COMPLETED'
  const flowIndex = STATUS_FLOW.indexOf(task.status)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tasks
          </button>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="text-foreground font-medium truncate max-w-xs">{task.title}</span>
        </nav>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight leading-tight">{task.title}</h1>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5 tracking-wider">{task.taskCode}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </span>
                    )}
                    {isDueSoon && !isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3" />
                        {daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue}d`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => void loadData()}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {canModify && (
                  <Button
                    onClick={() => setEditOpen(true)}
                    className="gap-2 text-white border-0 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-sm"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Task
                  </Button>
                )}
              </div>
            </div>
            {task.description && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Description</p>
                <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-sm font-semibold">Progress</p>
          </div>
          <div className="flex items-center">
            {STATUS_FLOW.map((s, i) => {
              const isCompleted = flowIndex > i
              const isCurrent = flowIndex === i
              const isBlocked = task.status === 'BLOCKED' && isCurrent
              return (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                      isBlocked
                        ? 'border-red-500 bg-red-500/10 text-red-600'
                        : isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isCurrent
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-border bg-muted text-muted-foreground',
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={cn(
                      'mt-1.5 text-xs font-medium whitespace-nowrap',
                      isBlocked ? 'text-red-600 dark:text-red-400'
                        : isCompleted || isCurrent ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground',
                    )}>
                      {statusMap[s].label}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all',
                      flowIndex > i ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-border',
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">

          <div className="lg:col-span-2">

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
                  <ClipboardList className="h-3 w-3 text-white" />
                </div>
                <p className="text-xs font-semibold">Details</p>
              </div>
              <div className="px-4 py-1">
                <InfoRow
                  label="Project"
                  value={
                    project ? (
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2 font-semibold"
                      >
                        <FolderOpen className="h-3 w-3" />
                        {project.name}
                      </button>
                    ) : (
                      `Project #${task.projectId}`
                    )
                  }
                />
                <InfoRow
                  label="Est. Hours"
                  value={
                    task.estimatedHours !== null
                      ? <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{task.estimatedHours}h</span>
                      : '—'
                  }
                />
                <InfoRow label="Start Date" value={formatDate(task.startDate)} />
                <InfoRow
                  label="Due Date"
                  value={
                    <span className={cn(
                      'font-semibold',
                      isOverdue ? 'text-destructive' : isDueSoon ? 'text-amber-600 dark:text-amber-400' : '',
                    )}>
                      {formatDate(task.dueDate)}
                      {isOverdue && <span className="ml-2 font-normal opacity-75">Overdue</span>}
                      {isDueSoon && !isOverdue && (
                        <span className="ml-2 font-normal opacity-75">
                          {daysUntilDue === 0 ? 'Today!' : `${daysUntilDue}d left`}
                        </span>
                      )}
                    </span>
                  }
                />
                <InfoRow label="Created" value={formatDateTime(task.createdAt)} />
                <InfoRow label="Last Updated" value={formatDateTime(task.updatedAt)} />
              </div>
            </div>
          </div>

          <div className="space-y-5">

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
                  <User className="h-3 w-3 text-white" />
                </div>
                <p className="text-xs font-semibold">Assignee</p>
              </div>
              <div className="p-4">
                {assignedUser ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm select-none shadow-md">
                      {assignedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{assignedUser.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{assignedUser.email}</p>
                      {assignedUser.designation && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{assignedUser.designation}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border">
                      <User className="h-4 w-4" />
                    </div>
                    <p className="text-xs italic">No one assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {(isOverdue || isDueSoon) && (
              <div className={cn(
                'flex items-start gap-3 rounded-2xl border p-4 shadow-sm',
                isOverdue
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              )}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {isOverdue ? 'Task overdue' : 'Due soon'}
                  </p>
                  <p className="text-xs mt-1 opacity-80">
                    {isOverdue
                      ? `Was due on ${formatDate(task.dueDate)}`
                      : daysUntilDue === 0
                        ? 'Due today'
                        : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
            )}

            {canUpdateStatus && (
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
                      <RefreshCw className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-xs font-semibold">Update Status</p>
                  </div>
                  {isUpdatingStatus && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="p-2.5 space-y-1">
                  {ALL_STATUSES.map((s) => {
                    const isCurrent = s === task.status
                    const meta = statusMap[s]
                    return (
                      <button
                        key={s}
                        disabled={isCurrent || isUpdatingStatus}
                        onClick={() => void handleStatusChange(s)}
                        className={cn(
                          'flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-xs font-medium border transition-all text-left',
                          isCurrent
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30 cursor-default'
                            : 'border-border bg-background hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-700 dark:hover:text-emerald-400 text-muted-foreground',
                          !isCurrent && isUpdatingStatus && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        <div className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all',
                          isCurrent
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {isCurrent
                            ? <CheckCircle2 className="h-3.5 w-3.5" />
                            : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </div>
                        <span>{meta.label}</span>
                        {isCurrent && (
                          <span className="ml-auto text-xs opacity-60 font-normal">Current</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {canModify && task && (
        <TaskEditModal
          task={task}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleUpdateSubmit}
          users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
        />
      )}
    </div>
  )
}
