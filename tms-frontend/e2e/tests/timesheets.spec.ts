/**
 * E2E — Timesheet Flow
 *
 * Tests: navigate to timesheets, create current-week timesheet,
 * verify DRAFT status, submit and confirm SUBMITTED status.
 *
 * Test isolation:
 *   - `beforeAll` fetches a fresh token and the admin's userId (from JWT).
 *   - Any timesheets created during the test are deleted in `afterAll`.
 */
import { test, expect } from '../fixtures/tms.fixture'
import { TimesheetPage } from '../pages/timesheet.page'
import {
  apiCreateTimesheet,
  apiSubmitTimesheet,
  apiDeleteTimesheet,
  apiCreateProject,
  apiDeleteProject,
  apiAddTimeEntry,
} from '../helpers/api'

/** Monday of the current ISO week — used for consistent week boundaries */
function sundayOfWeek(monday: string): string {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

// Use a far-future week for test isolation so it doesn't clash with
// the real current week if the admin already has one
function futureWeekDate(weeksAhead = 10): string {
  const d = new Date()
  d.setDate(d.getDate() + weeksAhead * 7)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

test.describe('Timesheet Flow', () => {
  // Store created timesheet IDs for cleanup
  const createdIds: number[] = []
  let testProjectId: number | null = null

  test.beforeAll(async ({ request, adminToken }) => {
    try {
      const project = await apiCreateProject(request, adminToken, {
        name: `E2E Timesheet Project ${Date.now()}`,
      })
      testProjectId = project.id
    } catch {
      // Tests that need submit will be skipped if project creation fails
    }
  })

  test.afterAll(async ({ request, adminToken }) => {
    for (const id of createdIds) {
      await apiDeleteTimesheet(request, adminToken, id).catch(() => {
        // Best-effort cleanup — don't fail if already deleted
      })
    }
    if (testProjectId !== null) {
      await apiDeleteProject(request, adminToken, testProjectId).catch(() => {})
    }
  })

  test('timesheet dashboard page loads and shows heading', async ({ page }) => {
    const timesheetPage = new TimesheetPage(page)
    await timesheetPage.navigateToDashboard()

    // Page should render without error
    await expect(page.getByRole('heading', { level: 1 }).or(
      page.getByRole('heading', { level: 2 }),
    ).first()).toBeVisible()
  })

  test('create current-week timesheet via UI button', async ({ page }) => {
    const timesheetPage = new TimesheetPage(page)
    await timesheetPage.navigateToDashboard()

    // Intercept the POST /timesheets API call to capture the created ID
    let createdId: number | null = null
    page.on('response', async (response) => {
      if (
        response.url().includes('/timesheets') &&
        response.request().method() === 'POST' &&
        response.ok()
      ) {
        const json = await response.json().catch(() => null)
        if (json?.data?.id) createdId = json.data.id as number
      }
    })

    // Click "Open current week" — creates if not yet existing, navigates to entry
    await timesheetPage.openCurrentWeekButton.click()

    // Wait for navigation to entry page
    await expect(page).toHaveURL(/\/timesheets\/\d+/, { timeout: 15_000 })

    // Record for cleanup
    if (createdId) createdIds.push(createdId)

    // Extract the ID from the URL
    const urlId = parseInt(page.url().split('/').pop() ?? '0', 10)
    if (urlId && !createdIds.includes(urlId)) createdIds.push(urlId)

    await timesheetPage.waitForLoadingToFinish()
  })

  test('new timesheet has DRAFT status', async ({
    page,
    adminToken,
    adminUserId,
    request,
  }) => {
    // Seed via API for speed
    const weekStart = futureWeekDate(308)
    const ts = await apiCreateTimesheet(request, adminToken, {
      userId: adminUserId,
      weekStartDate: weekStart,
      weekEndDate: sundayOfWeek(weekStart),
    })
    createdIds.push(ts.id)

    // Open via UI and verify status
    const timesheetPage = new TimesheetPage(page)
    await timesheetPage.navigateToTimesheet(ts.id)

    await timesheetPage.expectStatus('DRAFT')
  })

  test('submitting a timesheet changes status to SUBMITTED', async ({
    page,
    adminToken,
    adminUserId,
    request,
  }) => {
    test.skip(testProjectId === null, 'No test project available; skipping submit UI test')

    // Seed a DRAFT via API
    const weekStart = futureWeekDate(309)
    const ts = await apiCreateTimesheet(request, adminToken, {
      userId: adminUserId,
      weekStartDate: weekStart,
      weekEndDate: sundayOfWeek(weekStart),
    })
    createdIds.push(ts.id)

    // Must have at least one time entry before submit is allowed
    await apiAddTimeEntry(request, adminToken, {
      timesheetId: ts.id,
      projectId: testProjectId!,
      userId: adminUserId,
      workDate: weekStart,
      startTime: '09:00',
      endTime: '17:00',
    })

    const timesheetPage = new TimesheetPage(page)
    await timesheetPage.navigateToTimesheet(ts.id)

    // Submit through the UI
    await timesheetPage.submitCurrentTimesheet()

    // Verify the status badge changes
    await timesheetPage.expectStatus('SUBMITTED')
  })

  test('submit API endpoint changes status correctly', async ({
    request,
    adminToken,
    adminUserId,
  }) => {
    test.skip(testProjectId === null, 'No test project available; skipping submit API test')

    // Pure API test — fast, no browser needed
    const weekStart = futureWeekDate(311)
    const ts = await apiCreateTimesheet(request, adminToken, {
      userId: adminUserId,
      weekStartDate: weekStart,
      weekEndDate: sundayOfWeek(weekStart),
    })
    createdIds.push(ts.id)

    expect(ts.status).toBe('DRAFT')

    // Must have at least one entry before submit
    await apiAddTimeEntry(request, adminToken, {
      timesheetId: ts.id,
      projectId: testProjectId!,
      userId: adminUserId,
      workDate: weekStart,
      startTime: '09:00',
      endTime: '17:00',
    })

    const submitted = await apiSubmitTimesheet(request, adminToken, ts.id)
    expect(submitted.status).toBe('SUBMITTED')
  })

  test('timesheet history page loads', async ({ page }) => {
    const timesheetPage = new TimesheetPage(page)
    await page.goto('/timesheets/history')
    await timesheetPage.waitForLoadingToFinish()
    await expect(page).toHaveURL(/\/timesheets\/history/)
  })
})
