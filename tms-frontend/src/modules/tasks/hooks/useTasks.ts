import { useCallback } from 'react'
import { toast } from 'sonner'

import {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useGetTasksByProjectQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} from '@/features/tasks/tasksApi'
import type {
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskStatusUpdateRequest,
} from '../types/task.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message
  return msg ?? fallback
}

export function useTasks() {
  const { data: page, isLoading, error: queryError, refetch: fetchTasks } = useGetTasksQuery()
  const tasks = page?.content ?? []
  const error = queryError ? 'Failed to load tasks' : null

  const [createTaskMutation] = useCreateTaskMutation()
  const [updateTaskMutation] = useUpdateTaskMutation()
  const [updateTaskStatusMutation] = useUpdateTaskStatusMutation()
  const [deleteTaskMutation] = useDeleteTaskMutation()

  const createTask = useCallback(
    async (payload: TaskCreateRequest): Promise<boolean> => {
      try {
        await createTaskMutation(payload).unwrap()
        toast.success('Task created successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create task'))
        return false
      }
    },
    [createTaskMutation],
  )

  const updateTask = useCallback(
    async (id: number, payload: TaskUpdateRequest): Promise<boolean> => {
      try {
        await updateTaskMutation({ id, body: payload }).unwrap()
        toast.success('Task updated successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update task'))
        return false
      }
    },
    [updateTaskMutation],
  )

  const updateTaskStatus = useCallback(
    async (id: number, payload: TaskStatusUpdateRequest): Promise<boolean> => {
      try {
        await updateTaskStatusMutation({ id, body: payload }).unwrap()
        toast.success('Task status updated')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update task status'))
        return false
      }
    },
    [updateTaskStatusMutation],
  )

  const deleteTask = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteTaskMutation(id).unwrap()
        toast.success('Task deleted successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete task'))
        return false
      }
    },
    [deleteTaskMutation],
  )

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  }
}

// ── Single task fetch ─────────────────────────────────────────────────────────
export function useTask(id: number | null) {
  const { data: task = null, isLoading, error: queryError } = useGetTaskByIdQuery(
    id!,
    { skip: id === null },
  )
  const error = queryError ? 'Failed to load task' : null
  return { task, isLoading, error }
}

// ── Tasks by project ──────────────────────────────────────────────────────────
export function useTasksByProject(projectId: number | null) {
  const { data: tasks = [], isLoading } = useGetTasksByProjectQuery(
    projectId!,
    { skip: projectId === null },
  )
  return { tasks, isLoading }
}
