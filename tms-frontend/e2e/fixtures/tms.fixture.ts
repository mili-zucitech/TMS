/**
 * Playwright test fixtures.
 *
 * Extends the base `test` object with:
 *   - `adminToken`   — a fresh JWT string for API calls inside tests
 *   - `adminUserId`  — the UUID of the seeded admin user
 *
 * Import `test` and `expect` from this file instead of `@playwright/test`
 * in any spec file that needs these fixtures.
 */
import { test as base, expect } from '@playwright/test'
import { apiLogin } from '../helpers/api'
import { decodeJwtPayload, TEST_USERS } from '../helpers/auth'

interface TmsFixtures {
  /** Bearer token for the admin account — refreshed per test */
  adminToken: string
  /** UUID of the admin user extracted from the JWT payload */
  adminUserId: string
}

export const test = base.extend<TmsFixtures>({
  adminToken: async ({ request }, use) => {
    const { accessToken } = await apiLogin(
      request,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
    )
    await use(accessToken)
  },

  adminUserId: async ({ request }, use) => {
    const { accessToken } = await apiLogin(
      request,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
    )
    const payload = decodeJwtPayload(accessToken)
    const userId = String(payload['userId'] ?? '')
    await use(userId)
  },
})

export { expect }
