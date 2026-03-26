/**
 * Auth helper utilities for E2E tests.
 *
 * Provides fast API-based login that bypasses the UI and seeds
 * the browser's localStorage exactly as the real AuthProvider does.
 *
 * Usage:
 *   const auth = await loginViaApi(page, 'admin@tms.com', 'Admin@123')
 *   await page.goto('/dashboard')
 */
import type { Page, BrowserContext } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { apiLogin, API_BASE } from './api'

// ── JWT helpers ───────────────────────────────────────────────────────────────

/** Decode the JWT payload without verifying the signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1]
  // atob equivalent in Node.js
  const decoded = Buffer.from(base64, 'base64url').toString('utf-8')
  return JSON.parse(decoded) as Record<string, unknown>
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwtPayload(token)
    const exp = payload['exp'] as number | undefined
    return exp !== undefined && Date.now() / 1000 > exp
  } catch {
    return true
  }
}

// ── Auth user shape ───────────────────────────────────────────────────────────
// Must match authSlice's AuthUser interface

export interface AuthUser {
  email: string
  userId: string | null
  roleName: string | null
}

export interface StoredAuthState {
  token: string
  user: AuthUser
}

// ── Core login helper ─────────────────────────────────────────────────────────

/**
 * Logs in via the backend API and injects the JWT+user into the browser's
 * localStorage — identical to what `authSlice.setCredentials()` persists.
 *
 * Call this BEFORE `page.goto()` so the auth state is available on first load.
 */
export async function loginViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<StoredAuthState> {
  const { accessToken } = await apiLogin(page.request, email, password)

  const payload = decodeJwtPayload(accessToken)

  // Match the exact logic in AuthContext.tsx:
  // JWT has `roles: ["ROLE_ADMIN"]` — extract first entry and strip the prefix
  const rolesArr = Array.isArray(payload['roles']) ? (payload['roles'] as string[]) : []
  const user: AuthUser = {
    email: String(payload['sub'] ?? email),
    userId: payload['userId'] != null ? String(payload['userId']) : null,
    roleName: rolesArr[0]?.replace(/^ROLE_/, '') ?? null,
  }

  // Navigate to the app to establish the correct origin's localStorage context.
  // Using page.evaluate (NOT addInitScript) so auth is written exactly once and does
  // NOT re-run on subsequent page.goto() calls — crucial for logout-redirect tests.
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ token, user }: { token: string; user: AuthUser }) => {
      localStorage.setItem('tms_token', token)
      localStorage.setItem('tms_user', JSON.stringify(user))
    },
    { token: accessToken, user },
  )

  return { token: accessToken, user }
}

/**
 * Logs in via the backend API for a context (without a page).
 * Returns the token + user so you can save a storageState file.
 */
export async function loginViaApiForContext(
  request: APIRequestContext,
  context: BrowserContext,
  email: string,
  password: string,
): Promise<StoredAuthState> {
  const { accessToken } = await apiLogin(request, email, password)

  const payload = decodeJwtPayload(accessToken)

  const rolesArr2 = Array.isArray(payload['roles']) ? (payload['roles'] as string[]) : []
  const user: AuthUser = {
    email: String(payload['sub'] ?? email),
    userId: payload['userId'] != null ? String(payload['userId']) : null,
    roleName: rolesArr2[0]?.replace(/^ROLE_/, '') ?? null,
  }

  // Seed localStorage for all future pages opened in this context
  await context.addInitScript(
    ({ token, user }: { token: string; user: AuthUser }) => {
      localStorage.setItem('tms_token', token)
      localStorage.setItem('tms_user', JSON.stringify(user))
    },
    { token: accessToken, user },
  )

  return { token: accessToken, user }
}

/**
 * Clears auth state from localStorage (simulates logout at the storage level).
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('tms_token')
    localStorage.removeItem('tms_user')
  })
}

// ── Well-known test accounts ──────────────────────────────────────────────────

export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@tms.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123',
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? 'manager@tms.com',
    password: process.env.E2E_MANAGER_PASSWORD ?? 'Manager@123',
  },
} as const

// ── API base export for convenience ──────────────────────────────────────────
export { API_BASE }
