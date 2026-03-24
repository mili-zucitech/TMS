import { useCallback } from 'react'
import { toast } from 'sonner'

import {
  useGetAssignmentsByProjectQuery,
  useAssignUserMutation,
  useRemoveAssignmentMutation,
} from '@/features/projects/projectsApi'
import type { ProjectAssignmentRequest } from '../types/project.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message
  return msg ?? fallback
}

export function useProjectAssignments(projectId: number | null) {
  const { data: assignments = [], isLoading } = useGetAssignmentsByProjectQuery(
    projectId!,
    { skip: projectId === null },
  )

  const [assignUserMutation] = useAssignUserMutation()
  const [removeAssignmentMutation] = useRemoveAssignmentMutation()

  const assignUser = useCallback(
    async (payload: ProjectAssignmentRequest): Promise<boolean> => {
      try {
        await assignUserMutation(payload).unwrap()
        toast.success('Employee assigned to project')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to assign employee'))
        return false
      }
    },
    [assignUserMutation],
  )

  const removeAssignment = useCallback(
    async (assignmentId: number): Promise<boolean> => {
      if (projectId === null) return false
      try {
        await removeAssignmentMutation({ assignmentId, projectId }).unwrap()
        toast.success('Employee removed from project')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to remove employee'))
        return false
      }
    },
    [removeAssignmentMutation, projectId],
  )

  return { assignments, isLoading, assignUser, removeAssignment }
}
