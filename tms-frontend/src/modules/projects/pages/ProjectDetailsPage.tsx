import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  Building2,
  User,
  Hash,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import projectService from '../services/projectService'
import userModuleService from '@/modules/users/services/userService'
import departmentService from '@/modules/users/services/departmentService'
import { ProjectStatusBadge } from '../components/ProjectStatusBadge'
import { ProjectEditModal } from '../components/ProjectEditModal'
import { ProjectTeamManager } from '../components/ProjectTeamManager'
import type { ProjectResponse, ProjectUpdateRequest } from '../types/project.types'
import type { UserResponse } from '@/modules/users/types/user.types'
import type { DepartmentResponse } from '@/modules/users/types/user.types'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/types/api.types'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

// ── Info row component ────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [project, setProject] = useState<ProjectResponse | null>(null)
  const [allUsers, setAllUsers] = useState<UserResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // Resolve the logged-in user's UUID once allUsers is loaded
  const currentUserId = useMemo(
    () => allUsers.find((u) => u.email === authUser?.email)?.id,
    [allUsers, authUser?.email],
  )

  // Role-based access
  const isOwningManager =
    (authUser?.roleName === 'MANAGER' || authUser?.roleName === 'HR_MANAGER') && project?.projectManagerId === currentUserId
  const canModify = authUser?.roleName === 'ADMIN' || authUser?.roleName === 'DIRECTOR' || isOwningManager
  const canManageTeam = authUser?.roleName === 'ADMIN' || authUser?.roleName === 'DIRECTOR' || isOwningManager

  const projectId = id ? parseInt(id, 10) : null

  const loadData = async () => {
    if (!projectId || isNaN(projectId)) {
      setError('Invalid project ID')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [proj, usersPage, deptsPage] = await Promise.all([
        projectService.getProjectById(projectId),
        userModuleService.getUsers(0, 500),
        departmentService.getDepartments(),
      ])
      setProject(proj)
      setAllUsers(usersPage.content)
      setDepartments(deptsPage.content)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load project details'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleUpdateSubmit = async (id: number, data: ProjectUpdateRequest): Promise<boolean> => {
    try {
      const updated = await projectService.updateProject(id, data)
      setProject(updated)
      toast.success('Project updated successfully')
      return true
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update project'))
      return false
    }
  }

  // ── Loading skeleton ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────
  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="mb-6 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-4 text-sm text-destructive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error ?? 'Project not found'}</span>
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

  // ── Manager name lookup ────────────────────────────────
  const managerUser = project.projectManagerId
    ? allUsers.find((u) => u.id === project.projectManagerId)
    : null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Back nav ──────────────────────────────────── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        {/* ── Project header card ───────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-md shadow-emerald-500/25 select-none">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{project.name}</h1>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="text-sm font-mono text-primary mt-0.5">{project.projectCode}</p>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                    {project.description}
                  </p>
                )}
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
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-sm shadow-emerald-500/25 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Project
                </Button>
              )}
            </div>
          </div>

          {/* ── Info grid ────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-border">
            <InfoRow
              icon={Hash}
              label="Project Code"
              value={<span className="font-mono">{project.projectCode}</span>}
            />
            <InfoRow
              icon={Building2}
              label="Client"
              value={project.clientName ?? '—'}
            />
            <InfoRow
              icon={User}
              label="Project Manager"
              value={
                managerUser
                  ? `${managerUser.name} (${managerUser.employeeId})`
                  : project.projectManagerId
                    ? project.projectManagerId
                    : '—'
              }
            />
            <InfoRow
              icon={CalendarDays}
              label="Start Date"
              value={formatDate(project.startDate)}
            />
            <InfoRow
              icon={CalendarDays}
              label="End Date"
              value={formatDate(project.endDate)}
            />
            {project.departmentId != null && (
              <InfoRow
                icon={Building2}
                label="Department"
                value={
                  departments.find((d) => d.id === project.departmentId)?.name
                  ?? `Dept. ${project.departmentId}`
                }
              />
            )}
          </div>
        </div>

        {/* ── Team Manager ──────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <ProjectTeamManager
            projectId={project.id}
            departmentId={project.departmentId}
            allUsers={allUsers}
            canManageTeam={canManageTeam}
          />
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────── */}
      <ProjectEditModal
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdateSubmit}
        departments={departments}
        managers={allUsers.filter((u) => u.roleName === 'MANAGER' || u.roleName === 'HR_MANAGER' || u.roleName === 'DIRECTOR').map((u) => ({ id: u.id, name: u.name, employeeId: u.employeeId }))}
      />
    </div>
  )
}
