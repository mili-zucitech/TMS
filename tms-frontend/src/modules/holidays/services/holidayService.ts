import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  HolidayCreateRequest,
  HolidayResponse,
  HolidayUpdateRequest,
} from '../types/holiday.types'

const BASE = '/holidays'

// GET /api/v1/holidays
export async function getHolidays(): Promise<HolidayResponse[]> {
  const res = await axiosClient.get<ApiResponse<HolidayResponse[]>>(BASE)
  return res.data.data
}

// GET /api/v1/holidays/:id
export async function getHolidayById(id: number): Promise<HolidayResponse> {
  const res = await axiosClient.get<ApiResponse<HolidayResponse>>(`${BASE}/${id}`)
  return res.data.data
}

// GET /api/v1/holidays/range?startDate=&endDate=
export async function getHolidaysInRange(
  startDate: string,
  endDate: string,
): Promise<HolidayResponse[]> {
  const res = await axiosClient.get<ApiResponse<HolidayResponse[]>>(`${BASE}/range`, {
    params: { startDate, endDate },
  })
  return res.data.data
}

// POST /api/v1/holidays  (ADMIN only)
export async function createHoliday(
  payload: HolidayCreateRequest,
): Promise<HolidayResponse> {
  const res = await axiosClient.post<ApiResponse<HolidayResponse>>(BASE, payload)
  return res.data.data
}

// PUT /api/v1/holidays/:id  (ADMIN only)
export async function updateHoliday(
  id: number,
  payload: HolidayUpdateRequest,
): Promise<HolidayResponse> {
  const res = await axiosClient.put<ApiResponse<HolidayResponse>>(
    `${BASE}/${id}`,
    payload,
  )
  return res.data.data
}

// DELETE /api/v1/holidays/:id  (ADMIN only)
export async function deleteHoliday(id: number): Promise<void> {
  await axiosClient.delete<ApiResponse<void>>(`${BASE}/${id}`)
}
