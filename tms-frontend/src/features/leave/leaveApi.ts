import { baseApi } from '@/store/baseApi'
import type {
  LeaveTypeResponse,
  LeaveRequestResponse,
  LeaveRequestCreateRequest,
  LeaveApproveRequest,
  LeaveRejectRequest,
  LeaveBalanceResponse,
} from '@/modules/leaves/types/leave.types'

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Leave Types ────────────────────────────────────────────────────────
    getLeaveTypes: builder.query<LeaveTypeResponse[], void>({
      query: () => '/leave-types',
      providesTags: ['LeaveType'],
    }),
    // ── Leave Requests ──────────────────────────────────────────────────────
    getLeavesByUser: builder.query<LeaveRequestResponse[], string>({
      query: (userId) => `/leaves/user/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'Leave', id: userId }],
    }),
    getTeamLeavesByManager: builder.query<LeaveRequestResponse[], string>({
      query: (managerId) => `/leaves/manager/${managerId}`,
      providesTags: (_result, _error, managerId) => [{ type: 'Leave', id: `manager-${managerId}` }],
    }),
    applyLeave: builder.mutation<LeaveRequestResponse, LeaveRequestCreateRequest>({
      query: (body) => ({ url: '/leaves', method: 'POST', body }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Leave', id: userId },
        { type: 'LeaveBalance', id: userId },
      ],
    }),
    approveLeave: builder.mutation<LeaveRequestResponse, { id: number; body?: LeaveApproveRequest; managerId: string }>({
      query: ({ id, body }) => ({
        url: `/leaves/${id}/approve`,
        method: 'POST',
        body: body ?? {},
      }),
      invalidatesTags: (_result, _error, { managerId }) => [
        { type: 'Leave', id: `manager-${managerId}` },
        'Leave',
      ],
    }),
    rejectLeave: builder.mutation<LeaveRequestResponse, { id: number; body: LeaveRejectRequest; managerId: string }>({
      query: ({ id, body }) => ({
        url: `/leaves/${id}/reject`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { managerId }) => [
        { type: 'Leave', id: `manager-${managerId}` },
        'Leave',
      ],
    }),
    cancelLeave: builder.mutation<LeaveRequestResponse, { id: number; userId: string }>({
      query: ({ id }) => ({ url: `/leaves/${id}/cancel`, method: 'POST', body: {} }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Leave', id: userId },
        { type: 'LeaveBalance', id: userId },
      ],
    }),
    // ── Leave Balance ───────────────────────────────────────────────────────
    getLeaveBalance: builder.query<LeaveBalanceResponse[], string>({
      query: (userId) => `/leave-balances/user/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'LeaveBalance', id: userId }],
    }),
    initializeLeaveBalances: builder.mutation<{ year: number; recordsCreated: number }, number>({
      query: (year) => ({ url: `/leave-balances/initialize/${year}`, method: 'POST', body: {} }),
      invalidatesTags: ['LeaveBalance'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetLeaveTypesQuery,
  useGetLeavesByUserQuery,
  useGetTeamLeavesByManagerQuery,
  useApplyLeaveMutation,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useCancelLeaveMutation,
  useGetLeaveBalanceQuery,
  useInitializeLeaveBalancesMutation,
} = leaveApi
