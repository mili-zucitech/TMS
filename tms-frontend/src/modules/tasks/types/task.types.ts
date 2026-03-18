// ── Enums ─────────────────────────────────────────────────────────────────────
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// ── Response ──────────────────────────────────────────────────────────────────
export interface TaskResponse {
  id: number
  taskCode: string
  title: string
  description: string | null
  projectId: number
  assignedUserId: string | null
  createdByUserId: string | null
  priority: TaskPriority
  status: TaskStatus
  estimatedHours: number | null
  startDate: string | null   // LocalDate → "YYYY-MM-DD"
  dueDate: string | null     // LocalDate → "YYYY-MM-DD"
  createdAt: string          // LocalDateTime
  updatedAt: string          // LocalDateTime
}

// ── Requests ──────────────────────────────────────────────────────────────────
export interface TaskCreateRequest {
  title: string
  description?: string
  projectId: number
  assignedUserId?: string
  priority?: TaskPriority
  status?: TaskStatus
  estimatedHours?: number
  startDate?: string
  dueDate?: string
}

export interface TaskUpdateRequest {
  title?: string
  description?: string
  assignedUserId?: string
  priority?: TaskPriority
  status?: TaskStatus
  estimatedHours?: number
  startDate?: string
  dueDate?: string
}

export interface TaskStatusUpdateRequest {
  status: TaskStatus
}

// ── Spring Page wrapper (shared shape) ────────────────────────────────────────
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
