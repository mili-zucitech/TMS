import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListTodo,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  AlertCircle,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import { TaskTable } from '../components/TaskTable'
import { TaskSearchBar } from '../components/TaskSearchBar'
import { TaskFilters } from '../components/TaskFilters'
import { TaskCreateModal } from '../components/TaskCreateModal'
import { TaskEditModal } from '../components/TaskEditModal'
import { TaskKanbanBoard } from '../components/TaskKanbanBoard'
import type { TaskResponse, TaskCreateRequest, TaskUpdateRequest } from '../types/task.types'

// ── Lazy-load project and user lists ──────────────────────────────────────────
// We import the existing module services to avoid re-fetching patterns
import projectService from '@/modules/projects/services/projectService'
import userModuleService from '@/modules/users/services/userService'
import taskService from '../services/taskService'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { ProjectResponse } from '@/modules/projects/types/project.types'
import type { UserResponse } from '@/modules/users/types/user.types'

type ViewMode = 'table' | 'kanban'

export default function TaskListPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const { tasks, isLoading, error, fetchTasks, createTask, updateTask, deleteTask } = useTasks()

  // Role-based access
  const canModify =
    authUser?.roleName === 'ADMIN' ||
    authUser?.roleName === 'HR_MANAGER' ||
    authUser?.roleName === 'MANAGER' ||
    authUser?.roleName === 'DIRECTOR'
  const canDelete = authUser?.roleName === 'ADMIN'
  const canUpdateStatus = authUser?.roleName === 'EMPLOYEE'

  // ── Reference data ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const hasLoaded = useRef(false)

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    Promise.all([
      projectService.getProjects(0, 500).catch(() => ({ content: [] as ProjectResponse[] })),
      userModuleService.getUsers(0, 500).catch(() => ({ content: [] as UserResponse[] })),
    ]).then(([pPage, uPage]) => {
      setProjects(pPage.content)
      setUsers(uPage.content)
    })
  }, [])

  // Resolve current user's UUID directly from the JWT
  const currentUserId = authUser?.userId

  // Managers (MANAGER/HR_MANAGER) only see projects they manage; admins/HR/DIRECTOR see all
  const visibleProjects = useMemo(
    () =>
      authUser?.roleName === 'MANAGER' || authUser?.roleName === 'HR_MANAGER'
        ? projects.filter((p) => p.projectManagerId === currentUserId)
        : projects,
    [projects, authUser?.roleName, currentUserId],
  )

  const projectNames = useMemo(
    () =>
      Object.fromEntries(projects.map((p) => [p.id, p.name])) as Record<number, string>,
    [projects],
  )
  const userNames = useMemo(
    () =>
      Object.fromEntries(users.map((u) => [u.id, u.name])) as Record<string, string>,
    [users],
  )

  // ── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // ── Filter / search state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  // ── Modal state ────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<TaskResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Filtered tasks ─────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return tasks.filter((t) => {
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.taskCode.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      const matchStatus = !statusFilter || t.status === statusFilter
      const matchPriority = !priorityFilter || t.priority === priorityFilter
      const matchProject = !projectFilter || String(t.projectId) === projectFilter
      return matchSearch && matchStatus && matchPriority && matchProject
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateSubmit = async (
    base: Omit<TaskCreateRequest, 'assignedUserId'>,
    selectedUserIds: string[],
  ): Promise<boolean> => {
    // No user selected → single task, unassigned
    if (selectedUserIds.length === 0) {
      return createTask(base as TaskCreateRequest)
    }
    // Single user → normal single create
    if (selectedUserIds.length === 1) {
      return createTask({ ...base, assignedUserId: selectedUserIds[0] })
    }
    // Multiple users → create one task per user
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) =>
          taskService.createTask({ ...base, assignedUserId: userId }),
        ),
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed === 0) {
        toast.success(`${succeeded} tasks created successfully`)
      } else {
        toast.warning(`${succeeded} created, ${failed} failed`)
      }
      await fetchTasks()
      return failed === 0
    } catch {
      toast.error('Failed to create tasks')
      return false
    }
  }

  const handleUpdateSubmit = (id: number, data: TaskUpdateRequest): Promise<boolean> =>
    updateTask(id, data)


  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deleteTask(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const clearFilters = () => {
    setStatusFilter('')
    setPriorityFilter('')
    setProjectFilter('')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <ListTodo className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading…'
                  : `${filteredTasks.length} of ${tasks.length} tasks`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-input bg-background p-1 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:text-white'
                    : ''
                }`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${
                  viewMode === 'kanban'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:text-white'
                    : ''
                }`}
                onClick={() => setViewMode('kanban')}
                title="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => void fetchTasks()}
              disabled={isLoading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {canModify && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => void fetchTasks()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Search + Filter toolbar ───────────────────────── */}
        {viewMode === 'table' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <TaskSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              className="sm:flex-1"
            />
            <TaskFilters
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              projectFilter={projectFilter}
              projects={visibleProjects}
              onStatusChange={setStatusFilter}
              onPriorityChange={setPriorityFilter}
              onProjectChange={setProjectFilter}
              onClear={clearFilters}
            />
          </div>
        )}

        {/* ── Content ──────────────────────────────────────── */}
        {viewMode === 'table' ? (
          <TaskTable
            data={filteredTasks}
            isLoading={isLoading}
            canModify={canModify}
            canDelete={canDelete}
            projectNames={projectNames}
            userNames={userNames}
            onEditTask={setEditTask}
            onDeleteTask={setDeleteTarget}
          />
        ) : (
          <TaskKanbanBoard
            tasks={filteredTasks}
            userNames={userNames}
            canUpdateStatus={canUpdateStatus}
            onTaskClick={(t) => navigate(`/tasks/${t.id}`)}
            onStatusChanged={() => void fetchTasks()}
          />
        )}
      </div>

      {/* ── Create Modal ──────────────────────────────────────── */}
      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        projects={visibleProjects.map((p) => ({ id: p.id, name: p.name }))}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
      />

      {/* ── Edit Modal ────────────────────────────────────────── */}
      <TaskEditModal
        task={editTask}
        open={editTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditTask(null)
        }}
        onSubmit={handleUpdateSubmit}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
      />

      {/* ── Delete Confirm Dialog ─────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 mb-1">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.title}</span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={isDeleting}
            >
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
