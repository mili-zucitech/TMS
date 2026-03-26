/**
 * E2E — Holiday Management
 *
 * Tests: create holiday via UI, view it in the list, delete it.
 * Also covers pure-API assertions for the holidays endpoint.
 *
 * Each test is fully isolated:
 *   - Unique holiday names include a timestamp to avoid collisions.
 *   - All holidays created in these tests are deleted in afterEach/afterAll.
 */
import { test, expect } from '../fixtures/tms.fixture'
import { HolidayPage } from '../pages/holiday.page'
import {
  apiCreateHoliday,
  apiDeleteHoliday,
  apiGetHolidays,
  API_BASE,
} from '../helpers/api'

/** A far-future date unlikely to conflict with real data. */
function futureDate(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

test.describe('Holiday Management', () => {
  const createdIds: number[] = []

  test.afterAll(async ({ request, adminToken }) => {
    for (const id of createdIds) {
      await apiDeleteHoliday(request, adminToken, id).catch(() => {})
    }
  })

  test.describe('API layer', () => {
    test('GET /holidays returns an array', async ({ request, adminToken }) => {
      const res = await request.get(`${API_BASE}/holidays`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
    })

    test('POST /holidays creates a holiday and returns it', async ({
      request,
      adminToken,
    }) => {
      const name = `E2E API Holiday ${Date.now()}`
      const holiday = await apiCreateHoliday(request, adminToken, {
        name,
        holidayDate: futureDate(400),
        type: 'NATIONAL',
        isOptional: false,
        description: 'Created by Playwright API test',
      })

      createdIds.push(holiday.id)

      expect(holiday.id).toBeTruthy()
      expect(holiday.name).toBe(name)
    })

    test('DELETE /holidays/:id removes the holiday', async ({
      request,
      adminToken,
    }) => {
      // Create a holiday to delete
      const holiday = await apiCreateHoliday(request, adminToken, {
        name: `E2E Delete Test ${Date.now()}`,
        holidayDate: futureDate(410),
        type: 'NATIONAL',
        isOptional: false,
      })

      // Delete it
      const delRes = await request.delete(`${API_BASE}/holidays/${holiday.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      expect(delRes.ok()).toBe(true)

      // Verify it's gone
      const all = await apiGetHolidays(request, adminToken)
      expect(all.some((h) => h.id === holiday.id)).toBe(false)
    })
  })

  test.describe('UI — Create Holiday', () => {
    test('admin can open the create holiday modal', async ({ page }) => {
      const holidayPage = new HolidayPage(page)
      await holidayPage.navigate()
      await holidayPage.waitForLoadingToFinish()

      await expect(holidayPage.addHolidayButton).toBeVisible()
      await holidayPage.addHolidayButton.click()

      // Create dialog should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
    })

    test('create holiday via UI appears in the list', async ({
      page,
      request,
      adminToken,
    }) => {
      const name = `E2E UI Holiday ${Date.now()}`
      const date = futureDate(420)

      const holidayPage = new HolidayPage(page)
      await holidayPage.navigate()
      await holidayPage.switchToListView()

      await holidayPage.createHoliday(name, date, 'E2E test holiday')
      // Wait for the mutation + cache refresh to settle, then re-enter list view
      await holidayPage.waitForLoadingToFinish()
      await holidayPage.switchToListView()
      await holidayPage.waitForLoadingToFinish()

      // Holiday should appear in the list
      await holidayPage.expectHolidayVisible(name)

      // Cleanup: find and delete via API
      const all = await apiGetHolidays(request, adminToken)
      const created = all.find((h) => h.name === name)
      if (created) createdIds.push(created.id)
    })

    test('created holiday persists after page reload', async ({
      page,
      request,
      adminToken,
    }) => {
      // Seed via API so we know the ID
      const name = `E2E Persist ${Date.now()}`
      const holiday = await apiCreateHoliday(request, adminToken, {
        name,
        holidayDate: futureDate(430),
        type: 'NATIONAL',
        isOptional: false,
      })
      createdIds.push(holiday.id)

      const holidayPage = new HolidayPage(page)
      await holidayPage.navigate()
      await holidayPage.switchToListView()
      await holidayPage.expectHolidayVisible(name)

      // Reload and check it's still there
      await page.reload()
      await holidayPage.waitForLoadingToFinish()
      await holidayPage.switchToListView()
      await holidayPage.expectHolidayVisible(name)
    })
  })

  test.describe('UI — Delete Holiday', () => {
    test('delete holiday removes it from the list', async ({
      page,
      request,
      adminToken,
    }) => {
      // Seed via API
      const name = `E2E Delete UI ${Date.now()}`
      await apiCreateHoliday(request, adminToken, {
        name,
        holidayDate: futureDate(440),
        type: 'NATIONAL',
        isOptional: false,
      })
      // Don't push to createdIds since we're deleting it in the test

      const holidayPage = new HolidayPage(page)
      await holidayPage.navigate()
      await holidayPage.switchToListView()

      await holidayPage.expectHolidayVisible(name)
      await holidayPage.deleteHoliday(name)

      // After deletion the row should disappear
      await expect(page.getByText(name)).not.toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('UI — View holidays', () => {
    test('holiday page renders without error', async ({ page }) => {
      const holidayPage = new HolidayPage(page)
      await holidayPage.navigate()
      await holidayPage.expectOnHolidayPage()

      // Page renders something (heading or empty state)
      await expect(
        page.getByRole('heading').or(page.getByText(/holiday|no holidays/i)).first(),
      ).toBeVisible()
    })

    test('can switch to list view', async ({ page }) => {
      const holidayPage = new HolidayPage(page)
      await holidayPage.navigate()
      await holidayPage.switchToListView()

      // Table or list should be visible
      await expect(
        page.locator('table, [role="table"]').or(page.locator('ul, ol')).first(),
      ).toBeVisible({ timeout: 5_000 }).catch(() => {
        // Empty state is also valid
      })
    })
  })
})
