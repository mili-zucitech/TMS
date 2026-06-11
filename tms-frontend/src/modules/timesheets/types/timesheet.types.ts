// ── Enums ─────────────────────────────────────────────────────────────────────
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED'

// ── Timesheet (weekly container) ──────────────────────────────────────────────
export interface TimesheetResponse {
  id: number
  userId: string            // UUID
  weekStartDate: string     // LocalDate → "YYYY-MM-DD"
  weekEndDate: string       // LocalDate → "YYYY-MM-DD"
  status: TimesheetStatus
  submittedAt: string | null
  approvedAt: string | null
  approvedBy: string | null // UUID
  rejectionReason: string | null
  overtimeReason: string | null
  createdAt: string
  updatedAt: string
  /** Sum of durationMinutes across all time entries. Populated by the backend. */
  totalMinutes: number
}

export interface TimesheetCreateRequest {
  userId: string       // UUID
  weekStartDate: string
  weekEndDate: string
}

export interface TimesheetApproveRequest {
  approvedBy?: string  // UUID, optional
}

export interface TimesheetSubmitRequest {
  overtimeReason?: string
}

export interface TimesheetRejectRequest {
  approvedBy?: string  // UUID, optional
  rejectionReason: string
}

export interface TimesheetFilterParams {
  year?: number
  month?: number   // 1 = January … 12 = December
  week?: number    // ISO week number 1–53
}

// ── TimeEntry (individual log entry) ─────────────────────────────────────────
export interface TimeEntryResponse {
  id: number
  timesheetId: number
  projectId: number
  taskId: number | null
  taskNote: string | null
  userId: string        // UUID
  workDate: string      // LocalDate → "YYYY-MM-DD"
  startTime: string     // LocalTime → "HH:mm:ss"
  endTime: string       // LocalTime → "HH:mm:ss"
  durationMinutes: number | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface TimeEntryCreateRequest {
  timesheetId: number
  projectId: number
  taskId?: number
  taskNote?: string
  userId: string        // UUID
  workDate: string      // "YYYY-MM-DD"
  startTime: string     // "HH:mm" or "HH:mm:ss"
  endTime: string       // "HH:mm" or "HH:mm:ss"
  description?: string
}

export interface TimeEntryUpdateRequest {
  projectId?: number
  taskId?: number
  taskNote?: string
  workDate?: string
  startTime?: string
  endTime?: string
  description?: string
}

// ── Utility types ─────────────────────────────────────────────────────────────

/** A pending (unsaved) entry row in the UI */
export interface PendingEntry {
  _localId: string   // unique client-side id
  workDate: string
  projectId: number | ''
  taskId: number | ''
  startTime: string
  endTime: string
  description: string
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  numberOfElements: number
  empty: boolean
}
