import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import taskService from '../services/taskService'
import type {
  TaskResponse,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskStatusUpdateRequest,
} from '../types/task.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await taskService.getTasks(0, 200)
      setTasks(page.content)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load tasks'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = useCallback(
    async (payload: TaskCreateRequest): Promise<boolean> => {
      try {
        await taskService.createTask(payload)
        toast.success('Task created successfully')
        await fetchTasks()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create task'))
        return false
      }
    },
    [fetchTasks],
  )

  const updateTask = useCallback(
    async (id: number, payload: TaskUpdateRequest): Promise<boolean> => {
      try {
        await taskService.updateTask(id, payload)
        toast.success('Task updated successfully')
        await fetchTasks()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update task'))
        return false
      }
    },
    [fetchTasks],
  )

  const updateTaskStatus = useCallback(
    async (id: number, payload: TaskStatusUpdateRequest): Promise<boolean> => {
      try {
        await taskService.updateTaskStatus(id, payload)
        toast.success('Task status updated')
        await fetchTasks()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update task status'))
        return false
      }
    },
    [fetchTasks],
  )

  const deleteTask = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await taskService.deleteTask(id)
        toast.success('Task deleted successfully')
        await fetchTasks()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete task'))
        return false
      }
    },
    [fetchTasks],
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
  const [task, setTask] = useState<TaskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTask = useCallback(async () => {
    if (id === null) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await taskService.getTaskById(id)
      setTask(data)
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse<unknown>>
      setError(axiosErr?.response?.data?.message ?? 'Failed to load task')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  return { task, isLoading, error, fetchTask }
}

// ── Tasks by project ──────────────────────────────────────────────────────────
export function useTasksByProject(projectId: number | null) {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (projectId === null) return
    setIsLoading(true)
    taskService
      .getTasksByProject(projectId)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setIsLoading(false))
  }, [projectId])

  return { tasks, isLoading }
}
