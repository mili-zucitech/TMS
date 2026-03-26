/**
 * E2E — Dashboard
 *
 * Tests: page loads, key sections are rendered, navigation works.
 * These are lightweight smoke tests — not deep data assertions.
 */
import { test, expect } from '../fixtures/tms.fixture'
import { DashboardPage } from '../pages/dashboard.page'

test.describe('Dashboard', () => {
  test('dashboard page loads without errors', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()
    await dashboard.expectOnDashboard()

    // No full-page error boundary should be shown
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    await expect(page.getByText(/unexpected error/i)).not.toBeVisible()
  })

  test('main content area is visible', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()

    await expect(
      page.locator('main, [role="main"], #root > div').first(),
    ).toBeVisible()
  })

  test('renders page heading or welcome text', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()

    // Some heading or greeting should appear
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('navigation links are present in the layout', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()

    // At least one nav link to timesheets or holidays should be present
    const nav = page.locator('nav, [role="navigation"]').first()
    await expect(nav).toBeVisible()
  })

  test('navigating to timesheets from dashboard works', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()

    // Click the first timesheets link available
    await page.getByRole('link', { name: /timesheets/i }).first().click()
    await expect(page).toHaveURL(/\/timesheets/)
  })

  test('navigating to holidays from dashboard works', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()

    await page.getByRole('link', { name: /holidays/i }).first().click()
    await expect(page).toHaveURL(/\/holidays/)
  })

  test('navigating to leave from dashboard works', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigate()

    await page.getByRole('link', { name: /leave/i }).first().click()
    await expect(page).toHaveURL(/\/leave/)
  })

  test.describe('API — Dashboard data endpoints', () => {
    test('GET /users returns data', async ({ request, adminToken }) => {
      const res = await request.get(
        `${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8080/api/v1'}/users`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )
      expect(res.ok()).toBe(true)
    })

    test('GET /holidays returns data', async ({ request, adminToken }) => {
      const res = await request.get(
        `${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8080/api/v1'}/holidays`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )
      expect(res.ok()).toBe(true)
    })

    test('unauthorized request to /users returns 401 or 403', async ({ request }) => {
      const res = await request.get(
        `${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8080/api/v1'}/users`,
      )
      expect([401, 403]).toContain(res.status())
    })
  })
})
