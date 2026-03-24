import { baseApi } from '@/store/baseApi'
import type {
  ProjectResponse,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectAssignmentRequest,
  ProjectAssignmentResponse,
  SpringPage,
} from '@/modules/projects/types/project.types'

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<SpringPage<ProjectResponse>, { page?: number; size?: number } | void>({
      query: (params) => ({
        url: '/projects',
        params: { page: params?.page ?? 0, size: params?.size ?? 200, sort: 'name,asc' },
      }),
      providesTags: ['Project'],
    }),
    getProjectById: builder.query<ProjectResponse, number>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<ProjectResponse, ProjectCreateRequest>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<ProjectResponse, { id: number; body: ProjectUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/projects/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => ['Project', { type: 'Project', id }],
    }),
    archiveProject: builder.mutation<ProjectResponse, number>({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),
    // Assignments
    getAssignmentsByProject: builder.query<ProjectAssignmentResponse[], number>({
      query: (projectId) => `/project-assignments/project/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectAssignment', id: projectId }],
    }),
    getAssignmentsByUser: builder.query<ProjectAssignmentResponse[], string>({
      query: (userId) => `/project-assignments/user/${userId}`,
      providesTags: ['ProjectAssignment'],
    }),
    assignUser: builder.mutation<ProjectAssignmentResponse, ProjectAssignmentRequest>({
      query: (body) => ({ url: '/project-assignments', method: 'POST', body }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'ProjectAssignment', id: projectId },
      ],
    }),
    removeAssignment: builder.mutation<void, { assignmentId: number; projectId: number }>({
      query: ({ assignmentId }) => ({
        url: `/project-assignments/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'ProjectAssignment', id: projectId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
  useGetAssignmentsByProjectQuery,
  useGetAssignmentsByUserQuery,
  useAssignUserMutation,
  useRemoveAssignmentMutation,
} = projectsApi
