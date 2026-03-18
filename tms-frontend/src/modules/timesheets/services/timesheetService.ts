import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  TimesheetResponse,
  TimesheetCreateRequest,
  TimesheetApproveRequest,
  TimesheetRejectRequest,
  TimeEntryResponse,
  TimeEntryCreateRequest,
  TimeEntryUpdateRequest,
} from '../types/timesheet.types'

// ── Timesheet endpoints (/api/v1/timesheets) ──────────────────────────────────
const TIMESHEET_BASE = '/timesheets'
const ENTRY_BASE = '/time-entries'

const timesheetService = {
  // ── Timesheets ────────────────────────────────────────────────────────────

  async createTimesheet(payload: TimesheetCreateRequest): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      TIMESHEET_BASE,
      payload,
    )
    return data.data
  },

  async getTimesheetById(id: number): Promise<TimesheetResponse> {
    const { data } = await axiosClient.get<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}`,
    )
    return data.data
  },

  async getTimesheetsByUser(userId: string): Promise<TimesheetResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TimesheetResponse[]>>(
      `${TIMESHEET_BASE}/user/${userId}`,
    )
    return data.data
  },

  async submitTimesheet(id: number): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}/submit`,
    )
    return data.data
  },

  async approveTimesheet(
    id: number,
    payload?: TimesheetApproveRequest,
  ): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}/approve`,
      payload ?? {},
    )
    return data.data
  },

  async rejectTimesheet(
    id: number,
    payload: TimesheetRejectRequest,
  ): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}/reject`,
      payload,
    )
    return data.data
  },

  async lockTimesheet(id: number): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}/lock`,
    )
    return data.data
  },

  // ── Time Entries ──────────────────────────────────────────────────────────

  async createTimeEntry(payload: TimeEntryCreateRequest): Promise<TimeEntryResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimeEntryResponse>>(
      ENTRY_BASE,
      payload,
    )
    return data.data
  },

  async updateTimeEntry(
    id: number,
    payload: TimeEntryUpdateRequest,
  ): Promise<TimeEntryResponse> {
    const { data } = await axiosClient.put<ApiResponse<TimeEntryResponse>>(
      `${ENTRY_BASE}/${id}`,
      payload,
    )
    return data.data
  },

  async deleteTimeEntry(id: number): Promise<void> {
    await axiosClient.delete(`${ENTRY_BASE}/${id}`)
  },

  async getEntriesByTimesheet(timesheetId: number): Promise<TimeEntryResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TimeEntryResponse[]>>(
      `${ENTRY_BASE}/timesheet/${timesheetId}`,
    )
    return data.data
  },

  async getEntriesByUserAndDate(userId: string, date: string): Promise<TimeEntryResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TimeEntryResponse[]>>(
      `${ENTRY_BASE}/user/${userId}/date/${date}`,
    )
    return data.data
  },

  // ── Helper: ensure a timesheet exists for a given week ───────────────────
  /** Finds the timesheet for `userId+weekStartDate` in the user's list, or creates one. */
  async getOrCreateTimesheet(
    userId: string,
    weekStartDate: string,
    weekEndDate: string,
  ): Promise<TimesheetResponse> {
    const all = await timesheetService.getTimesheetsByUser(userId)
    const found = all.find((t) => t.weekStartDate === weekStartDate)
    if (found) return found
    return timesheetService.createTimesheet({ userId, weekStartDate, weekEndDate })
  },
}

export default timesheetService
