import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import { Provider } from 'react-redux'

import { store, createAppStore } from '@/store/store'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setCredentials,
  logout as logoutAction,
  selectToken,
  selectUser,
  selectIsAuthenticated,
  selectIsAuthLoading,
  setAuthLoading,
  type AuthUser,
} from '@/features/auth/authSlice'
import { useLoginMutation } from '@/features/auth/authApi'
import { isTokenExpired } from '@/utils/token'
import type { LoginRequest } from '@/types/api.types'

// ── JWT decode helper ─────────────────────────────────────────────────────────
function decodeJwtPayload(
  token: string,
): { sub: string; roles?: string[]; userId?: string; exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as {
      sub: string
      roles?: string[]
      userId?: string
      exp?: number
    }
  } catch {
    return null
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ── Inner provider — has access to Redux store ────────────────────────────────
function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const token = useAppSelector(selectToken)
  const user = useAppSelector(selectUser)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isLoading = useAppSelector(selectIsAuthLoading)

  const [loginMutation] = useLoginMutation()

  // Periodically check token expiry and logout if expired
  useEffect(() => {
    const checkExpiry = () => {
      const storedToken = localStorage.getItem('tms_token')
      if (storedToken && isTokenExpired(storedToken)) {
        dispatch(logoutAction())
      }
    }
    checkExpiry()
    const id = setInterval(checkExpiry, 60_000)
    return () => clearInterval(id)
  }, [dispatch])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      dispatch(setAuthLoading(true))
      try {
        const response = await loginMutation(credentials).unwrap()
        const decoded = decodeJwtPayload(response.accessToken)
        const roleName = decoded?.roles?.[0]?.replace(/^ROLE_/, '') ?? null
        const userId = decoded?.userId ?? null
        dispatch(
          setCredentials({
            token: response.accessToken,
            user: { email: credentials.email, userId, roleName },
          }),
        )
      } finally {
        dispatch(setAuthLoading(false))
      }
    },
    [dispatch, loginMutation],
  )

  const logout = useCallback(() => {
    dispatch(logoutAction())
  }, [dispatch])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated, isLoading, login, logout }),
    [user, token, isAuthenticated, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Public AuthProvider ───────────────────────────────────────────────────────
// Wraps children with the Redux Provider so all consumers have store access.
// Accepts an optional `store` prop to allow tests to inject a fresh store.
interface AuthProviderProps {
  children: React.ReactNode
  /** Inject a custom store (e.g. freshly created in tests). Defaults to the app singleton. */
  store?: ReturnType<typeof createAppStore>
}

export function AuthProvider({ children, store: storeOverride }: AuthProviderProps) {
  return (
    <Provider store={storeOverride ?? store}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
