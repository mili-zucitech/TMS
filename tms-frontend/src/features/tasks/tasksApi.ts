import { baseApi } from '@/store/baseApi'
import type {
  TaskResponse,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskStatusUpdateRequest,
  SpringPage,
} from '@/modules/tasks/types/task.types'

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<SpringPage<TaskResponse>, { page?: number; size?: number } | void>({
      query: (params) => ({
        url: '/tasks',
        params: { page: params?.page ?? 0, size: params?.size ?? 200, sort: 'title,asc' },
      }),
      providesTags: ['Task'],
    }),
    getTaskById: builder.query<TaskResponse, number>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    getTasksByProject: builder.query<TaskResponse[], number>({
      query: (projectId) => `/tasks/project/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: 'Task', id: `project-${projectId}` }],
    }),
    getTasksByUser: builder.query<TaskResponse[], string>({
      query: (userId) => `/tasks/user/${userId}`,
      providesTags: ['Task'],
    }),
    createTask: builder.mutation<TaskResponse, TaskCreateRequest>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<TaskResponse, { id: number; body: TaskUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/tasks/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
    }),
    updateTaskStatus: builder.mutation<TaskResponse, { id: number; body: TaskStatusUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/tasks/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => ['Task', { type: 'Task', id }],
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Task'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useGetTasksByProjectQuery,
  useGetTasksByUserQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} = tasksApi
