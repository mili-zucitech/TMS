import type { TimesheetStatus, TimesheetResponse, TimeEntryResponse } from '../../types/timesheet.types'
import type { UserResponse } from '@/modules/users/types/user.types'

// Re-export for convenience
export type { TimesheetStatus, TimesheetResponse, TimeEntryResponse }

/**
 * A timesheet enriched with the employee's display data for the review table.
 */
export interface ManagerTimesheetRow {
  timesheet: TimesheetResponse
  employee: UserResponse
  totalMinutes: number
}

/**
 * Payload for reject endpoint —  maps to TimesheetRejectRequest on backend.
 * approvedBy is the manager's UUID and is optional (backend sets it from security context).
 */
export interface ManagerRejectPayload {
  approvedBy?: string
  rejectionReason: string
}
