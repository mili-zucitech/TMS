/**
 * E2E — Manager Approval Flow
 *
 * Tests: manager views pending timesheets, approves one, rejects another.
 *
 * Strategy:
 *   - Seed a SUBMITTED timesheet via API before each test (no UI overhead).
 *   - Admin user has ADMIN role which can access the manager view.
 *   - Verify the UI reflects the updated status after approve / reject.
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
  API_BASE,
} from '../helpers/api'

function mondayOffset(weeksAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + weeksAhead * 7)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

function sunday(monday: string): string {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

test.describe('Manager Approval Flow', () => {
  const createdIds: number[] = []
  let testProjectId: number | null = null

  test.beforeAll(async ({ request, adminToken }) => {
    try {
      const project = await apiCreateProject(request, adminToken, {
        name: `E2E Approvals Project ${Date.now()}`,
      })
      testProjectId = project.id
    } catch {
      // submit/approve tests will be skipped if no project available
    }
  })

  test.afterAll(async ({ request, adminToken }) => {
    for (const id of createdIds) {
      await apiDeleteTimesheet(request, adminToken, id).catch(() => {})
    }
    if (testProjectId !== null) {
      await apiDeleteProject(request, adminToken, testProjectId).catch(() => {})
    }
  })

  /** Creates a timesheet, adds one entry, submits it — ready for approval/rejection. */
  async function seedSubmittedTimesheet(
    request: Parameters<typeof apiCreateTimesheet>[0],
    adminToken: string,
    adminUserId: string,
    weekStart: string,
  ) {
    const ts = await apiCreateTimesheet(request, adminToken, {
      userId: adminUserId,
      weekStartDate: weekStart,
      weekEndDate: sunday(weekStart),
    })
    createdIds.push(ts.id)
    if (testProjectId !== null) {
      await apiAddTimeEntry(request, adminToken, {
        timesheetId: ts.id,
        projectId: testProjectId,
        userId: adminUserId,
        workDate: weekStart,
        startTime: '09:00',
        endTime: '17:00',
      })
    }
    await apiSubmitTimesheet(request, adminToken, ts.id)
    return ts
  }

  test('manager timesheet page loads', async ({ page }) => {
    const ts = new TimesheetPage(page)
    await ts.navigateToManagerView()
    await ts.expectOnManagerView()
    // Should render some container (even if empty)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
  })

  test('submitted timesheets appear in manager view', async ({
    page,
    request,
    adminToken,
    adminUserId,
  }) => {
    // Seed: create + submit a timesheet via API
    const weekStart = mondayOffset(315)
    await seedSubmittedTimesheet(request, adminToken, adminUserId, weekStart)

    // Navigate to manager view and verify submitted timesheet appears
    const tsPage = new TimesheetPage(page)
    await tsPage.navigateToManagerView()
    await tsPage.waitForLoadingToFinish()

    // The submitted timesheet or "SUBMITTED" badge should be visible
    await expect(page.getByText(/submitted/i).first()).toBeVisible()
  })

  test('manager can approve a submitted timesheet via review page', async ({
    page,
    request,
    adminToken,
    adminUserId,
  }) => {
    // Seed a submitted timesheet
    const weekStart = mondayOffset(316)
    const ts = await seedSubmittedTimesheet(request, adminToken, adminUserId, weekStart)

    // Navigate directly to the review page
    const tsPage = new TimesheetPage(page)
    await page.goto(`/timesheets/manager/review/${ts.id}`)
    await tsPage.waitForLoadingToFinish()

    await tsPage.approveTimesheet()

    // Status should update to APPROVED
    await expect(page.getByText(/approved/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('manager can reject a submitted timesheet with a reason', async ({
    page,
    request,
    adminToken,
    adminUserId,
  }) => {
    const weekStart = mondayOffset(317)
    const ts = await seedSubmittedTimesheet(request, adminToken, adminUserId, weekStart)

    const tsPage = new TimesheetPage(page)
    await page.goto(`/timesheets/manager/review/${ts.id}`)
    await tsPage.waitForLoadingToFinish()

    await tsPage.rejectTimesheet('Missing project entries')

    await expect(page.getByText(/rejected/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('approve API endpoint returns APPROVED status', async ({
    request,
    adminToken,
    adminUserId,
  }) => {
    const weekStart = mondayOffset(320)
    const ts = await seedSubmittedTimesheet(request, adminToken, adminUserId, weekStart)
    // ts is already SUBMITTED — seedSubmittedTimesheet handles the submit step

    // Approve via API
    const approve = await request.post(`${API_BASE}/timesheets/${ts.id}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { approvedBy: adminUserId },
    })
    expect(approve.ok()).toBe(true)
    const body = await approve.json()
    expect(body.data.status).toBe('APPROVED')
  })

  test('reject API endpoint returns REJECTED status', async ({
    request,
    adminToken,
    adminUserId,
  }) => {
    const weekStart = mondayOffset(321)
    const ts = await seedSubmittedTimesheet(request, adminToken, adminUserId, weekStart)

    const reject = await request.post(`${API_BASE}/timesheets/${ts.id}/reject`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { rejectedBy: adminUserId, reason: 'Test rejection' },
    })
    expect(reject.ok()).toBe(true)
    const body = await reject.json()
    expect(body.data.status).toBe('REJECTED')
  })
})
