import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import projectService from '../services/projectService'
import type { ProjectAssignmentResponse, ProjectAssignmentRequest } from '../types/project.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

export function useProjectAssignments(projectId: number | null) {
  const [assignments, setAssignments] = useState<ProjectAssignmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAssignments = useCallback(async () => {
    if (projectId === null) return
    setIsLoading(true)
    try {
      const data = await projectService.getAssignmentsByProject(projectId)
      setAssignments(data)
    } catch {
      // silently fail — ProjectDetailsPage shows the error state
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const assignUser = useCallback(
    async (payload: ProjectAssignmentRequest): Promise<boolean> => {
      try {
        await projectService.assignUser(payload)
        toast.success('Employee assigned to project')
        await fetchAssignments()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to assign employee'))
        return false
      }
    },
    [fetchAssignments],
  )

  const removeAssignment = useCallback(
    async (assignmentId: number): Promise<boolean> => {
      try {
        await projectService.removeAssignment(assignmentId)
        toast.success('Employee removed from project')
        await fetchAssignments()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to remove employee'))
        return false
      }
    },
    [fetchAssignments],
  )

  return { assignments, isLoading, fetchAssignments, assignUser, removeAssignment }
}
