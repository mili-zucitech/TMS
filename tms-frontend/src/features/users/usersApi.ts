import { baseApi } from '@/store/baseApi'
import type {
  UserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  SpringPage,
} from '@/modules/users/types/user.types'

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<SpringPage<UserResponse>, { page?: number; size?: number } | void>({
      query: (params) => ({
        url: '/users',
        params: { page: params?.page ?? 0, size: params?.size ?? 200, sort: 'name,asc' },
      }),
      providesTags: ['User'],
    }),
    getUserById: builder.query<UserResponse, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    getUsersByTeam: builder.query<UserResponse[], string>({
      query: (managerId) => `/users/team/${managerId}`,
      providesTags: ['User'],
    }),
    getUsersByDepartment: builder.query<UserResponse[], number>({
      query: (departmentId) => `/users/department/${departmentId}`,
      providesTags: ['User'],
    }),
    createUser: builder.mutation<UserResponse, UserCreateRequest>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<UserResponse, { id: string; body: UserUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => ['User', { type: 'User', id }],
    }),
    deactivateUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetUsersByTeamQuery,
  useGetUsersByDepartmentQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
} = usersApi
