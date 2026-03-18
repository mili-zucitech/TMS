// ── Holiday Type enum ────────────────────────────────────────
// Mirrors com.company.tms.holiday.entity.HolidayType
export type HolidayType = 'NATIONAL' | 'COMPANY' | 'REGIONAL'

// ── Response DTO ─────────────────────────────────────────────
// Mirrors com.company.tms.holiday.dto.HolidayResponse
export interface HolidayResponse {
  id: number
  name: string
  description?: string
  /** ISO-8601 local date: "YYYY-MM-DD" */
  holidayDate: string
  type: HolidayType
  isOptional: boolean
  createdAt: string
  updatedAt: string
}

// ── Create Request DTO ───────────────────────────────────────
// Mirrors com.company.tms.holiday.dto.HolidayCreateRequest
export interface HolidayCreateRequest {
  name: string
  description?: string
  /** ISO-8601 local date: "YYYY-MM-DD" */
  holidayDate: string
  type: HolidayType
  isOptional?: boolean
}

// ── Update Request DTO ───────────────────────────────────────
// Mirrors com.company.tms.holiday.dto.HolidayUpdateRequest
export interface HolidayUpdateRequest {
  name?: string
  description?: string
  /** ISO-8601 local date: "YYYY-MM-DD" */
  holidayDate?: string
  type?: HolidayType
  isOptional?: boolean
}

// ── View mode ────────────────────────────────────────────────
export type HolidayViewMode = 'calendar' | 'list'
