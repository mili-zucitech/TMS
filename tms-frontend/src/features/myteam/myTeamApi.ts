import { baseApi } from '@/store/baseApi'
import type { UserResponse } from '@/modules/users/types/user.types'

export const myTeamApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeamMembers: builder.query<UserResponse[], string>({
      query: (managerId) => `/users/team/${managerId}`,
      providesTags: ['User'],
    }),
    getDepartmentMembers: builder.query<UserResponse[], number>({
      query: (departmentId) => `/users/department/${departmentId}`,
      providesTags: ['User'],
    }),
  }),
  overrideExisting: false,
})

export const { useGetTeamMembersQuery, useGetDepartmentMembersQuery } = myTeamApi
