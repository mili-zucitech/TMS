import { useCallback } from 'react'
import { toast } from 'sonner'

import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
} from '@/features/projects/projectsApi'
import type {
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from '../types/project.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message
  return msg ?? fallback
}

export function useProjects() {
  const { data: page, isLoading, error: queryError, refetch: fetchProjects } = useGetProjectsQuery()
  const projects = page?.content ?? []
  const error = queryError ? 'Failed to load projects' : null

  const [createProjectMutation] = useCreateProjectMutation()
  const [updateProjectMutation] = useUpdateProjectMutation()
  const [archiveProjectMutation] = useArchiveProjectMutation()

  const createProject = useCallback(
    async (payload: ProjectCreateRequest): Promise<boolean> => {
      try {
        await createProjectMutation(payload).unwrap()
        toast.success('Project created successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create project'))
        return false
      }
    },
    [createProjectMutation],
  )

  const updateProject = useCallback(
    async (id: number, payload: ProjectUpdateRequest): Promise<boolean> => {
      try {
        await updateProjectMutation({ id, body: payload }).unwrap()
        toast.success('Project updated successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update project'))
        return false
      }
    },
    [updateProjectMutation],
  )

  const archiveProject = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await archiveProjectMutation(id).unwrap()
        toast.success('Project archived successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to archive project'))
        return false
      }
    },
    [archiveProjectMutation],
  )

  return { projects, isLoading, error, fetchProjects, createProject, updateProject, archiveProject }
}
