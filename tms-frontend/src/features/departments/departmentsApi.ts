import { baseApi } from '@/store/baseApi'
import type {
  DepartmentDetail,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentMembersRequest,
  DepartmentMember,
} from '@/modules/departments/types/department.types'
import type { PagedResponse } from '@/modules/departments/services/departmentService'

export const departmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query<PagedResponse<DepartmentDetail>, { page?: number; size?: number } | void>({
      query: (params) => ({
        url: '/departments',
        params: { page: params?.page ?? 0, size: params?.size ?? 200, sort: 'name' },
      }),
      providesTags: ['Department'],
    }),
    getDepartmentById: builder.query<DepartmentDetail, number>({
      query: (id) => `/departments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),
    getDepartmentMembers: builder.query<DepartmentMember[], number>({
      query: (id) => `/departments/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),
    createDepartment: builder.mutation<DepartmentDetail, DepartmentCreateRequest>({
      query: (body) => ({ url: '/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),
    updateDepartment: builder.mutation<DepartmentDetail, { id: number; body: DepartmentUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/departments/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => ['Department', { type: 'Department', id }],
    }),
    deleteDepartment: builder.mutation<void, number>({
      query: (id) => ({ url: `/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Department'],
    }),
    addDepartmentMembers: builder.mutation<DepartmentDetail, { id: number; body: DepartmentMembersRequest }>({
      query: ({ id, body }) => ({
        url: `/departments/${id}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Department', id }],
    }),
    removeDepartmentMember: builder.mutation<void, { departmentId: number; userId: string }>({
      query: ({ departmentId, userId }) => ({
        url: `/departments/${departmentId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: 'Department', id: departmentId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useGetDepartmentMembersQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAddDepartmentMembersMutation,
  useRemoveDepartmentMemberMutation,
} = departmentsApi
