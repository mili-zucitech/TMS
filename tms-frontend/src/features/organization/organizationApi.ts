import { baseApi } from '@/store/baseApi'
import type { OrganizationDepartment } from '@/modules/organization/types/organization.types'

export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizationDepartments: builder.query<OrganizationDepartment[], void>({
      query: () => '/organization/departments',
      providesTags: ['Department'],
    }),
  }),
  overrideExisting: false,
})

export const { useGetOrganizationDepartmentsQuery } = organizationApi
