import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import authService from '@/services/authService'
import type { LoginRequest } from '@/types/api.types'

// ── JWT decode helper ─────────────────────────────────────────
function decodeJwtPayload(token: string): { sub: string; roles?: string[]; userId?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as { sub: string; roles?: string[]; userId?: string }
  } catch {
    return null
  }
}

// ── Types ────────────────────────────────────────────────────
interface AuthUser {
  email: string
  /** UUID from the JWT userId claim — used for API calls that require a user UUID */
  userId: string | null
  /** Role name without the ROLE_ prefix, e.g. "ADMIN", "HR" */
  roleName: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

// ── Storage keys ─────────────────────────────────────────────
const TOKEN_KEY = 'tms_token'
const USER_KEY = 'tms_user'

// ── Context ──────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  )
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? (JSON.parse(stored) as AuthUser) : null
  })
  const [isLoading, setIsLoading] = useState(false)

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [user])

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true)
    try {
      const response = await authService.login(credentials)
      setToken(response.accessToken)
      const decoded = decodeJwtPayload(response.accessToken)
      const roleName = decoded?.roles?.[0]?.replace(/^ROLE_/, '') ?? null
      const userId = decoded?.userId ?? null
      setUser({ email: credentials.email, userId, roleName })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
