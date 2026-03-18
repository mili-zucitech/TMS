// ── Leave Status enum ────────────────────────────────────────
// Mirrors com.company.tms.leave.entity.LeaveStatus
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

// ── Leave Type Response ──────────────────────────────────────
// Mirrors com.company.tms.leave.dto.LeaveTypeResponse
export interface LeaveTypeResponse {
  id: number
  name: string
  description?: string
  defaultAnnualAllocation: number
  requiresApproval: boolean
  createdAt: string
  updatedAt: string
}

// ── Leave Request Response ───────────────────────────────────
// Mirrors com.company.tms.leave.dto.LeaveRequestResponse
export interface LeaveRequestResponse {
  id: number
  userId: string
  leaveTypeId: number
  leaveTypeName: string
  /** ISO-8601 local date: "YYYY-MM-DD" */
  startDate: string
  endDate: string
  totalDays: number
  reason?: string
  status: LeaveStatus
  appliedAt: string
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
  employeeName?: string
}

// ── Leave Balance Response ───────────────────────────────────
// Mirrors com.company.tms.leave.dto.LeaveBalanceResponse
export interface LeaveBalanceResponse {
  id: number
  userId: string
  leaveTypeId: number
  leaveTypeName: string
  year: number
  totalAllocated: number
  usedLeaves: number
  remainingLeaves: number
  updatedAt: string
}

// ── Create Request DTO ───────────────────────────────────────
// Mirrors com.company.tms.leave.dto.LeaveRequestCreateRequest
export interface LeaveRequestCreateRequest {
  userId: string
  leaveTypeId: number
  /** ISO-8601 local date: "YYYY-MM-DD" */
  startDate: string
  endDate: string
  reason?: string
}

// ── Reject Request DTO ───────────────────────────────────────
// Mirrors com.company.tms.leave.dto.LeaveRejectRequest
export interface LeaveRejectRequest {
  approvedBy?: string
  rejectionReason: string
}

// ── Approve Request DTO ──────────────────────────────────────
// Mirrors com.company.tms.leave.dto.LeaveApproveRequest
export interface LeaveApproveRequest {
  approvedBy?: string
}
