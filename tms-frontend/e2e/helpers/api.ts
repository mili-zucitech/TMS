/**
 * API helper for E2E tests.
 *
 * Thin wrappers around Playwright's `APIRequestContext` that talk directly
 * to the Spring Boot backend.  Use these in `beforeAll` / `afterAll` hooks
 * to seed or clean up test data without going through the UI.
 */
import type { APIRequestContext } from '@playwright/test'

export const API_BASE =
  process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8080/api/v1'

// ── Generic helpers ──────────────────────────────────────────────────────────

/** Returns typed data from a successful ApiResponse<T> envelope. */
async function unwrap<T>(_request: APIRequestContext, response: Awaited<ReturnType<APIRequestContext['post']>>): Promise<T> {
  if (!response.ok()) {
    const text = await response.text()
    throw new Error(`API error ${response.status()}: ${text}`)
  }
  const body = await response.json() as { success: boolean; data: T; message?: string }
  return body.data
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string
  tokenType: string
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  })
  return unwrap<LoginResponse>(request, res)
}

// ── Holidays ─────────────────────────────────────────────────────────────────

export interface HolidayPayload {
  name: string
  holidayDate: string   // YYYY-MM-DD
  type?: string         // 'NATIONAL' | 'COMPANY' | 'REGIONAL' — optional but recommended
  description?: string
  isOptional?: boolean
}

export interface HolidayResponse {
  id: number
  name: string
  holidayDate: string
  description?: string
  isOptional: boolean
}

export async function apiCreateHoliday(
  request: APIRequestContext,
  token: string,
  payload: HolidayPayload,
): Promise<HolidayResponse> {
  const res = await request.post(`${API_BASE}/holidays`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  })
  return unwrap<HolidayResponse>(request, res)
}

export async function apiDeleteHoliday(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<void> {
  await request.delete(`${API_BASE}/holidays/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function apiGetHolidays(
  request: APIRequestContext,
  token: string,
): Promise<HolidayResponse[]> {
  const res = await request.get(`${API_BASE}/holidays`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return unwrap<HolidayResponse[]>(request, res)
}

// ── Timesheets ───────────────────────────────────────────────────────────────

export interface TimesheetPayload {
  userId: string
  weekStartDate: string  // YYYY-MM-DD
  weekEndDate: string    // YYYY-MM-DD
}

export interface TimesheetResponse {
  id: number
  userId: string
  weekStartDate: string
  weekEndDate: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED'
}

export async function apiCreateTimesheet(
  request: APIRequestContext,
  token: string,
  payload: TimesheetPayload,
): Promise<TimesheetResponse> {
  const res = await request.post(`${API_BASE}/timesheets`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  })
  return unwrap<TimesheetResponse>(request, res)
}

export async function apiSubmitTimesheet(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<TimesheetResponse> {
  const res = await request.post(`${API_BASE}/timesheets/${id}/submit`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return unwrap<TimesheetResponse>(request, res)
}

export async function apiApproveTimesheet(
  request: APIRequestContext,
  token: string,
  id: number,
  approvedBy: string,
): Promise<TimesheetResponse> {
  const res = await request.post(`${API_BASE}/timesheets/${id}/approve`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { approvedBy },
  })
  return unwrap<TimesheetResponse>(request, res)
}

export async function apiDeleteTimesheet(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<void> {
  await request.delete(`${API_BASE}/timesheets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string
  employeeId: string
  name: string
  email: string
  roleName: string
  status: string
}

export async function apiGetCurrentUser(
  request: APIRequestContext,
  token: string,
  userId: string,
): Promise<UserResponse> {
  const res = await request.get(`${API_BASE}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return unwrap<UserResponse>(request, res)
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectResponse {
  id: number
  name: string
}

export async function apiCreateProject(
  request: APIRequestContext,
  token: string,
  payload: { name: string; description?: string },
): Promise<ProjectResponse> {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  })
  return unwrap<ProjectResponse>(request, res)
}

export async function apiDeleteProject(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<void> {
  await request.delete(`${API_BASE}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Time Entries ─────────────────────────────────────────────────────────────

export async function apiAddTimeEntry(
  request: APIRequestContext,
  token: string,
  payload: {
    timesheetId: number
    projectId: number
    userId: string
    workDate: string    // YYYY-MM-DD, must be within the timesheet week
    startTime: string   // HH:mm
    endTime: string     // HH:mm
    description?: string
  },
): Promise<void> {
  const res = await request.post(`${API_BASE}/time-entries`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  })
  if (!res.ok()) {
    const text = await res.text()
    throw new Error(`Failed to add time entry (${res.status()}): ${text}`)
  }
}
