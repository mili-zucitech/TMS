import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store/store'

export interface AuthUser {
  email: string
  /** UUID from the JWT userId claim */
  userId: string | null
  /** Role name without the ROLE_ prefix, e.g. "ADMIN", "HR" */
  roleName: string | null
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isLoading: boolean
}

const TOKEN_KEY = 'tms_token'
const USER_KEY = 'tms_user'

function readUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY),
  user: readUserFromStorage(),
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isLoading = false
      localStorage.setItem(TOKEN_KEY, action.payload.token)
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    logout(state) {
      state.token = null
      state.user = null
      state.isLoading = false
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { setCredentials, logout, setAuthLoading } = authSlice.actions
export default authSlice.reducer

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectToken = (state: RootState) => state.auth.token
export const selectUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => !!state.auth.token
export const selectIsAuthLoading = (state: RootState) => state.auth.isLoading
