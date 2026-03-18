import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  LeaveApproveRequest,
  LeaveBalanceResponse,
  LeaveRejectRequest,
  LeaveRequestCreateRequest,
  LeaveRequestResponse,
  LeaveTypeResponse,
} from '../types/leave.types'

// ── Leave Types ──────────────────────────────────────────────
// GET /api/v1/leave-types
export async function getLeaveTypes(): Promise<LeaveTypeResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveTypeResponse[]>>('/leave-types')
  return res.data.data
}

// ── Leave Requests ───────────────────────────────────────────
// POST /api/v1/leaves
export async function applyLeave(
  payload: LeaveRequestCreateRequest,
): Promise<LeaveRequestResponse> {
  const res = await axiosClient.post<ApiResponse<LeaveRequestResponse>>('/leaves', payload)
  return res.data.data
}

// GET /api/v1/leaves/user/:userId
export async function getLeavesByUser(userId: string): Promise<LeaveRequestResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveRequestResponse[]>>(
    `/leaves/user/${userId}`,
  )
  return res.data.data
}

// GET /api/v1/leaves/manager/:managerId
export async function getTeamLeavesByManager(managerId: string): Promise<LeaveRequestResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveRequestResponse[]>>(
    `/leaves/manager/${managerId}`,
  )
  return res.data.data
}

// POST /api/v1/leaves/:id/approve
export async function approveLeave(
  id: number,
  payload?: LeaveApproveRequest,
): Promise<LeaveRequestResponse> {
  const res = await axiosClient.post<ApiResponse<LeaveRequestResponse>>(
    `/leaves/${id}/approve`,
    payload ?? {},
  )
  return res.data.data
}

// POST /api/v1/leaves/:id/reject
export async function rejectLeave(
  id: number,
  payload: LeaveRejectRequest,
): Promise<LeaveRequestResponse> {
  const res = await axiosClient.post<ApiResponse<LeaveRequestResponse>>(
    `/leaves/${id}/reject`,
    payload,
  )
  return res.data.data
}

// POST /api/v1/leaves/:id/cancel
export async function cancelLeave(id: number): Promise<LeaveRequestResponse> {
  const res = await axiosClient.post<ApiResponse<LeaveRequestResponse>>(
    `/leaves/${id}/cancel`,
  )
  return res.data.data
}

// ── Leave Balance ────────────────────────────────────────────
// GET /api/v1/leave-balances/user/:userId
export async function getLeaveBalance(userId: string): Promise<LeaveBalanceResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveBalanceResponse[]>>(
    `/leave-balances/user/${userId}`,
  )
  return res.data.data
}

// POST /api/v1/leave-balances/initialize/:year  (ADMIN / HR only)
export async function initializeLeaveBalances(
  year: number,
): Promise<{ year: number; recordsCreated: number }> {
  const res = await axiosClient.post<
    ApiResponse<{ year: number; recordsCreated: number }>
  >(`/leave-balances/initialize/${year}`)
  return res.data.data
}
