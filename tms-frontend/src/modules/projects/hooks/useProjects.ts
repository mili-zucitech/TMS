import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import projectService from '../services/projectService'
import type {
  ProjectResponse,
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from '../types/project.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await projectService.getProjects()
      setProjects(page.content)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load projects'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(
    async (payload: ProjectCreateRequest): Promise<boolean> => {
      try {
        await projectService.createProject(payload)
        toast.success('Project created successfully')
        await fetchProjects()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create project'))
        return false
      }
    },
    [fetchProjects],
  )

  const updateProject = useCallback(
    async (id: number, payload: ProjectUpdateRequest): Promise<boolean> => {
      try {
        await projectService.updateProject(id, payload)
        toast.success('Project updated successfully')
        await fetchProjects()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update project'))
        return false
      }
    },
    [fetchProjects],
  )

  const archiveProject = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await projectService.archiveProject(id)
        toast.success('Project archived successfully')
        await fetchProjects()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to archive project'))
        return false
      }
    },
    [fetchProjects],
  )

  return { projects, isLoading, error, fetchProjects, createProject, updateProject, archiveProject }
}
