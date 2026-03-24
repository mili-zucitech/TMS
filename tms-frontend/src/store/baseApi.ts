import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { logout } from '@/features/auth/authSlice'
import type { ApiResponse } from '@/types/api.types'
import { config } from '@/config/env'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiBaseUrl,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('tms_token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

/**
 * Wraps fetchBaseQuery to:
 *  1. Unwrap the ApiResponse<T> envelope so each endpoint sees plain T
 *  2. Dispatch logout() on any 401 response
 */
export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error) {
    if (result.error.status === 401) {
      api.dispatch(logout())
    }
    return result
  }

  if (result.data) {
    const envelope = result.data as ApiResponse<unknown>
    // Backend always wraps in { success, data, message }
    if ('data' in envelope) {
      return { data: envelope.data }
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'User',
    'Project',
    'ProjectAssignment',
    'Task',
    'Timesheet',
    'TimeEntry',
    'Leave',
    'LeaveBalance',
    'LeaveType',
    'Holiday',
    'Department',
    'Notification',
    'AuditLog',
  ],
  endpoints: () => ({}),
})
