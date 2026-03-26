/**
 * Auth setup — runs ONCE before all test suites.
 *
 * Logs in as admin via the API and persists the browser storage state to
 * `e2e/.auth/admin.json`.  The `chromium` project in playwright.config.ts
 * references this file so every test starts already authenticated.
 *
 * Re-run with:  npx playwright test --project=setup
 */
import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { loginViaApiForContext } from '../helpers/auth'
import { TEST_USERS } from '../helpers/auth'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AUTH_DIR = path.join(__dirname, '..', '.auth')
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json')

setup('save admin auth state', async ({ page, context, request }) => {
  // Ensure the .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }

  // Login via API — much faster than going through the login form
  await loginViaApiForContext(request, context, TEST_USERS.admin.email, TEST_USERS.admin.password)

  // Navigate once to warm up the app and confirm auth works
  await page.goto('/dashboard')
  await expect(page).not.toHaveURL(/\/login/)

  // Persist the storage state (cookies + localStorage) for reuse
  await context.storageState({ path: ADMIN_AUTH_FILE })

  console.log(`✅ Admin auth state saved to ${ADMIN_AUTH_FILE}`)
})
