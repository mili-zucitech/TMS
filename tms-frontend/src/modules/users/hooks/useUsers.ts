import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import userModuleService from '../services/userService'
import type { UserResponse, UserCreateRequest, UserUpdateRequest } from '../types/user.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

export function useUsers() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await userModuleService.getUsers()
      setUsers(page.content)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createUser = useCallback(
    async (payload: UserCreateRequest): Promise<boolean> => {
      try {
        await userModuleService.createUser(payload)
        toast.success('User created successfully')
        await fetchUsers()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create user'))
        return false
      }
    },
    [fetchUsers],
  )

  const updateUser = useCallback(
    async (id: string, payload: UserUpdateRequest): Promise<boolean> => {
      try {
        await userModuleService.updateUser(id, payload)
        toast.success('User updated successfully')
        await fetchUsers()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update user'))
        return false
      }
    },
    [fetchUsers],
  )

  const deactivateUser = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await userModuleService.deactivateUser(id)
        toast.success('User deactivated successfully')
        await fetchUsers()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to deactivate user'))
        return false
      }
    },
    [fetchUsers],
  )

  return { users, isLoading, error, fetchUsers, createUser, updateUser, deactivateUser }
}
