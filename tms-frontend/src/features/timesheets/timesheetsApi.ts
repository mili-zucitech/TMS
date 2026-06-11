import { baseApi } from '@/store/baseApi'
import type {
  TimesheetResponse,
  TimesheetCreateRequest,
  TimesheetApproveRequest,
  TimesheetRejectRequest,
  TimesheetFilterParams,
  TimeEntryResponse,
  TimeEntryCreateRequest,
  TimeEntryUpdateRequest,
} from '@/modules/timesheets/types/timesheet.types'

export const timesheetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Timesheets ─────────────────────────────────────────────────────────
    getTimesheetsByUser: builder.query<TimesheetResponse[], string>({
      query: (userId) => `/timesheets/user/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'Timesheet', id: userId }],
    }),
    getFilteredTimesheetsByUser: builder.query<
      TimesheetResponse[],
      { userId: string } & TimesheetFilterParams
    >({
      query: ({ userId, year, month, week }) => ({
        url: `/timesheets/user/${userId}`,
        params: {
          ...(year !== undefined && { year }),
          ...(month !== undefined && { month }),
          ...(week !== undefined && { week }),
        },
      }),
      providesTags: (_result, _error, { userId }) => [
        { type: 'Timesheet', id: `filtered-${userId}` },
      ],
    }),
    getTeamTimesheets: builder.query<TimesheetResponse[], string>({
      query: (managerId) => `/timesheets/manager/${managerId}`,
      providesTags: (_result, _error, managerId) => [{ type: 'Timesheet', id: `team-${managerId}` }],
    }),
    getTimesheetById: builder.query<TimesheetResponse, number>({
      query: (id) => `/timesheets/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Timesheet', id }],
    }),
    createTimesheet: builder.mutation<TimesheetResponse, TimesheetCreateRequest>({
      query: (body) => ({ url: '/timesheets', method: 'POST', body }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Timesheet', id: userId },
        { type: 'Timesheet', id: `filtered-${userId}` },
      ],
    }),
    submitTimesheet: builder.mutation<TimesheetResponse, number>({
      query: (id) => ({ url: `/timesheets/${id}/submit`, method: 'POST', body: {} }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Timesheet', id },
        'Timesheet',
      ],
    }),
    approveTimesheet: builder.mutation<TimesheetResponse, { id: number; body?: TimesheetApproveRequest }>({
      query: ({ id, body }) => ({
        url: `/timesheets/${id}/approve`,
        method: 'POST',
        body: body ?? {},
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Timesheet', id }, 'Timesheet'],
    }),
    rejectTimesheet: builder.mutation<TimesheetResponse, { id: number; body: TimesheetRejectRequest }>({
      query: ({ id, body }) => ({
        url: `/timesheets/${id}/reject`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Timesheet', id }, 'Timesheet'],
    }),
    lockTimesheet: builder.mutation<TimesheetResponse, number>({
      query: (id) => ({ url: `/timesheets/${id}/lock`, method: 'POST', body: {} }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Timesheet', id }, 'Timesheet'],
    }),
    // ── Time Entries ───────────────────────────────────────────────────────
    getEntriesByTimesheet: builder.query<TimeEntryResponse[], number>({
      query: (timesheetId) => `/time-entries/timesheet/${timesheetId}`,
      providesTags: (_result, _error, timesheetId) => [{ type: 'TimeEntry', id: timesheetId }],
    }),
    getEntriesByUserAndDate: builder.query<TimeEntryResponse[], { userId: string; date: string }>({
      query: ({ userId, date }) => `/time-entries/user/${userId}/date/${date}`,
      providesTags: ['TimeEntry'],
    }),
    createTimeEntry: builder.mutation<TimeEntryResponse, TimeEntryCreateRequest>({
      query: (body) => ({ url: '/time-entries', method: 'POST', body }),
      invalidatesTags: (_result, _error, { timesheetId }) => [
        { type: 'TimeEntry', id: timesheetId },
        { type: 'Timesheet', id: timesheetId },
      ],
    }),
    updateTimeEntry: builder.mutation<TimeEntryResponse, { id: number; body: TimeEntryUpdateRequest; timesheetId: number }>({
      query: ({ id, body }) => ({ url: `/time-entries/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { timesheetId }) => [
        { type: 'TimeEntry', id: timesheetId },
        { type: 'Timesheet', id: timesheetId },
      ],
    }),
    deleteTimeEntry: builder.mutation<void, { id: number; timesheetId: number }>({
      query: ({ id }) => ({ url: `/time-entries/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { timesheetId }) => [
        { type: 'TimeEntry', id: timesheetId },
        { type: 'Timesheet', id: timesheetId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetTimesheetsByUserQuery,
  useGetFilteredTimesheetsByUserQuery,
  useGetTeamTimesheetsQuery,
  useGetTimesheetByIdQuery,
  useCreateTimesheetMutation,
  useSubmitTimesheetMutation,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation,
  useLockTimesheetMutation,
  useGetEntriesByTimesheetQuery,
  useGetEntriesByUserAndDateQuery,
  useCreateTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation,
} = timesheetsApi
