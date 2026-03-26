/**
 * E2E — Authentication Flow
 *
 * Tests: login success, login failure, logout.
 *
 * These tests intentionally start WITHOUT a stored auth state so they can
 * assert the login page itself.  They run under the `chromium-unauth` project
 * which has no storageState configured.
 */
import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { DashboardPage } from '../pages/dashboard.page'
import { TEST_USERS } from '../helpers/auth'
import { API_BASE } from '../helpers/api'

test.describe('Authentication', () => {
  test.describe('Login success', () => {
    test('valid credentials redirect to dashboard', async ({ page }) => {
      const loginPage = new LoginPage(page)
      const dashboard = new DashboardPage(page)

      await loginPage.loginAs(TEST_USERS.admin.email, TEST_USERS.admin.password)

      // Should land on dashboard
      await dashboard.expectOnDashboard()
    })

    test('token is persisted in localStorage after login', async ({ page }) => {
      const loginPage = new LoginPage(page)

      await loginPage.loginAs(TEST_USERS.admin.email, TEST_USERS.admin.password)

      const token = await page.evaluate(() => localStorage.getItem('tms_token'))
      expect(token).toBeTruthy()
      expect(token!.split('.').length).toBe(3) // valid JWT has 3 parts
    })

    test('unauthenticated visit to protected page redirects to login', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })

    test('login page is accessible with correct structure', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.navigate()

      await expect(loginPage.emailInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()
      await expect(loginPage.submitButton).toBeVisible()
    })
  })

  test.describe('Login failure', () => {
    test('wrong password shows error message', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.navigate()
      await loginPage.fillAndSubmit(TEST_USERS.admin.email, 'wrong-password-123')

      await loginPage.expectErrorVisible()
    })

    test('unknown email shows error message', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.navigate()
      await loginPage.fillAndSubmit('nobody@nowhere.com', 'anything')

      await loginPage.expectErrorVisible()
    })

    test('empty form fields show validation errors', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.navigate()

      // Submit without filling anything
      await loginPage.submitButton.click()

      // React Hook Form + Zod validation messages should appear
      await expect(page.getByText(/email is required/i)).toBeVisible()
      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('invalid email format shows validation error', async ({ page }) => {
      const loginPage = new LoginPage(page)
      await loginPage.navigate()

      await loginPage.emailInput.fill('not-an-email')
      await loginPage.passwordInput.fill('password123')
      await loginPage.submitButton.click()

      await expect(page.getByText(/valid email/i)).toBeVisible()
    })
  })

  test.describe('API contract', () => {
    test('login endpoint returns accessToken in ApiResponse envelope', async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password },
      })

      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body).toMatchObject({
        success: true,
        data: { accessToken: expect.any(String), tokenType: 'Bearer' },
        message: expect.any(String),
      })
    })

    test('login with wrong credentials returns 401', async ({ request }) => {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { email: 'nobody@tms.com', password: 'badpass' },
      })

      expect(res.status()).toBe(401)
    })
  })

  test.describe('Logout', () => {
    // For logout tests we need to be logged in first — set up via API
    test.beforeEach(async ({ page }) => {
      // Quick API login to seed localStorage
      const { loginViaApi } = await import('../helpers/auth')
      await loginViaApi(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/dashboard')
    })

    test('logout clears session and redirects to login', async ({ page }) => {
      const dashboard = new DashboardPage(page)
      await dashboard.logout()

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

      // localStorage should be cleared
      const token = await page.evaluate(() => localStorage.getItem('tms_token'))
      expect(token).toBeNull()
    })

    test('after logout, protected routes redirect to login', async ({ page }) => {
      const dashboard = new DashboardPage(page)
      await dashboard.logout()
      await expect(page).toHaveURL(/\/login/)

      // Try navigating back to a protected route
      await page.goto('/timesheets')
      await expect(page).toHaveURL(/\/login/)
    })
  })
})
