import { useEffect, useMemo, useState } from 'react'
import { FolderOpen, FolderPlus, RefreshCw, AlertCircle, Archive } from 'lucide-react'

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
import { useProjects } from '../hooks/useProjects'
import { ProjectTable } from '../components/ProjectTable'
import { ProjectSearchBar } from '../components/ProjectSearchBar'
import { ProjectFilters } from '../components/ProjectFilters'
import { ProjectCreateModal } from '../components/ProjectCreateModal'
import { ProjectEditModal } from '../components/ProjectEditModal'
import type { ProjectResponse, ProjectCreateRequest, ProjectUpdateRequest } from '../types/project.types'
import projectService from '../services/projectService'
import departmentService from '@/modules/users/services/departmentService'
import userModuleService from '@/modules/users/services/userService'
import type { DepartmentResponse } from '@/modules/users/types/user.types'

export default function ProjectListPage() {
  const { user: authUser } = useAuth()
  const { projects, isLoading, error, fetchProjects, createProject, updateProject, archiveProject } =
    useProjects()

  // ── Departments + users ─────────────────────────────────────
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [managers, setManagers] = useState<{ id: string; name: string; employeeId: string }[]>([])
  const [myAssignedProjectIds, setMyAssignedProjectIds] = useState<Set<number>>(new Set())

  // userId is available directly from the JWT — no need to fetch the user list
  const currentUserId = authUser?.userId ?? undefined

  useEffect(() => {
    departmentService.getDepartments().then((p) => setDepartments(p.content)).catch(() => {})
    userModuleService.getUsers(0, 500).then((p) => {
      setManagers(
        p.content
          .filter((u) => u.roleName === 'MANAGER' || u.roleName === 'HR_MANAGER' || u.roleName === 'DIRECTOR')
          .map((u) => ({ id: u.id, name: u.name, employeeId: u.employeeId }))
      )
    }).catch(() => {})
  }, [])

  // For employees, load their project assignments once the current user ID is known
  useEffect(() => {
    if (authUser?.roleName === 'EMPLOYEE' && currentUserId) {
      projectService.getAssignmentsByUser(currentUserId)
        .then((assignments) =>
          setMyAssignedProjectIds(new Set(assignments.map((a) => a.projectId)))
        )
        .catch(() => {})
    }
  }, [authUser?.roleName, currentUserId])

  // Role-based access
  const canCreate = authUser?.roleName === 'ADMIN' || authUser?.roleName === 'HR_MANAGER' || authUser?.roleName === 'MANAGER' || authUser?.roleName === 'DIRECTOR'
  const canModify = authUser?.roleName === 'ADMIN' || authUser?.roleName === 'HR_MANAGER' || authUser?.roleName === 'MANAGER' || authUser?.roleName === 'DIRECTOR'
  const canArchive = authUser?.roleName === 'ADMIN'

  // ── Filter / search state ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // ── Modal state ────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<ProjectResponse | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ProjectResponse | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  // ── Client-side filtered data ──────────────────────────
  const roleFilteredProjects = useMemo(() => {
    if (authUser?.roleName === 'MANAGER' || authUser?.roleName === 'HR_MANAGER') {
      return projects.filter((p) => p.projectManagerId === currentUserId)
    }
    if (authUser?.roleName === 'EMPLOYEE') {
      return projects.filter((p) => myAssignedProjectIds.has(p.id))
    }
    return projects // ADMIN, HR, DIRECTOR see all
  }, [projects, authUser?.roleName, currentUserId, myAssignedProjectIds])

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return roleFilteredProjects.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.projectCode.toLowerCase().includes(q) ||
        (p.clientName ?? '').toLowerCase().includes(q)
      const matchStatus = !statusFilter || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [roleFilteredProjects, searchQuery, statusFilter])

  // ── Handlers ──────────────────────────────────────────
  const handleCreateSubmit = (data: ProjectCreateRequest): Promise<boolean> => {
    return createProject(data)
  }

  const handleUpdateSubmit = (id: number, data: ProjectUpdateRequest): Promise<boolean> => {
    return updateProject(id, data)
  }

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return
    setIsArchiving(true)
    await archiveProject(archiveTarget.id)
    setIsArchiving(false)
    setArchiveTarget(null)
  }

  const clearFilters = () => setStatusFilter('')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Page header ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading…'
                  : `${filteredProjects.length} of ${roleFilteredProjects.length} projects`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => void fetchProjects()}
              disabled={isLoading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {canCreate && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────── */}
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
              onClick={() => void fetchProjects()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Search + Filters toolbar ───────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <ProjectSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            className="sm:flex-1"
          />
          <ProjectFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onClear={clearFilters}
          />
        </div>

        {/* ── Table ──────────────────────────────────────── */}
        <ProjectTable
          data={filteredProjects}
          isLoading={isLoading}
          canModify={canModify}
          canArchive={canArchive}
          onEditProject={setEditProject}
          onArchiveProject={setArchiveTarget}
        />
      </div>

      {/* ── Create Modal ───────────────────────────────────── */}
      <ProjectCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        departments={departments}
        managers={managers}
      />

      {/* ── Edit Modal ─────────────────────────────────────── */}
      <ProjectEditModal
        project={editProject}
        open={editProject !== null}
        onOpenChange={(open) => {
          if (!open) setEditProject(null)
        }}
        onSubmit={handleUpdateSubmit}
        departments={departments}
        managers={managers}
      />

      {/* ── Archive Confirm Dialog ─────────────────────────── */}
      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 mb-1">
              <Archive className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive{' '}
              <span className="font-semibold text-foreground">
                {archiveTarget?.name}
              </span>
              ? This will mark the project as completed and it will no longer appear as active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setArchiveTarget(null)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving…' : 'Archive Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
