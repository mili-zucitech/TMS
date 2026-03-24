import { useCallback } from 'react'
import { toast } from 'sonner'

import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
} from '@/features/users/usersApi'
import type { UserCreateRequest, UserUpdateRequest } from '../types/user.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message
  return msg ?? fallback
}

export function useUsers() {
  const { data: page, isLoading, error: queryError, refetch: fetchUsers } = useGetUsersQuery()
  const users = page?.content ?? []
  const error = queryError ? 'Failed to load users' : null

  const [createUserMutation] = useCreateUserMutation()
  const [updateUserMutation] = useUpdateUserMutation()
  const [deactivateUserMutation] = useDeactivateUserMutation()

  const createUser = useCallback(
    async (payload: UserCreateRequest): Promise<boolean> => {
      try {
        await createUserMutation(payload).unwrap()
        toast.success('User created successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create user'))
        return false
      }
    },
    [createUserMutation],
  )

  const updateUser = useCallback(
    async (id: string, payload: UserUpdateRequest): Promise<boolean> => {
      try {
        await updateUserMutation({ id, body: payload }).unwrap()
        toast.success('User updated successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update user'))
        return false
      }
    },
    [updateUserMutation],
  )

  const deactivateUser = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deactivateUserMutation(id).unwrap()
        toast.success('User deactivated successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to deactivate user'))
        return false
      }
    },
    [deactivateUserMutation],
  )

  return { users, isLoading, error, fetchUsers, createUser, updateUser, deactivateUser }
}
