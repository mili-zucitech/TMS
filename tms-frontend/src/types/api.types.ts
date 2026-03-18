// ── Generic API envelope ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  errorCode?: string
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
}

