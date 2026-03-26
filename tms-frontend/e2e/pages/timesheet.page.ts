/**
 * Timesheet Page Object
 *
 * Covers `/timesheets` (dashboard), `/timesheets/:id` (entry),
 * `/timesheets/manager` (manager view), and
 * `/timesheets/manager/review/:id` (review).
 */
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class TimesheetPage extends BasePage {
  // ── Locators — Timesheet Dashboard ──────────────────────────────────────────

  get openCurrentWeekButton() {
    // Button label is dynamic: 'Log Hours' (DRAFT), 'Start This Week' (none), 'View Timesheet' (SUBMITTED/APPROVED)
    return this.page.getByRole('button', { name: /log hours|start this week|view timesheet/i })
  }

  get timesheetList() {
    return this.page.locator('table, [data-testid="timesheet-list"]').first()
  }

  /** Status badges rendered as text spans */
  statusBadge(status: string) {
    return this.page.getByText(status, { exact: true })
  }

  // ── Locators — Timesheet Entry ──────────────────────────────────────────────

  get addEntryButton() {
    return this.page.getByRole('button', { name: /add entry|add time|new entry/i })
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /submit timesheet|submit for approval/i })
  }

  get confirmSubmitButton() {
    // Confirmation dialog "Confirm" or "Submit" button
    return this.page.getByRole('button', { name: /confirm|yes|submit/i }).last()
  }

  get currentStatus() {
    // The status badge shown on the entry page (DRAFT, SUBMITTED, etc.)
    return this.page.locator('[data-testid="timesheet-status"], .status-badge').first()
  }

  // ── Locators — Manager View ─────────────────────────────────────────────────

  get pendingTimesheetRows() {
    return this.page.locator('tr, [data-testid="timesheet-row"]').filter({
      hasText: /submitted/i,
    })
  }

  get firstReviewButton() {
    return this.page.getByRole('link', { name: /review|view/i }).first()
  }

  get approveButton() {
    return this.page.getByRole('button', { name: /approve/i })
  }

  get rejectButton() {
    return this.page.getByRole('button', { name: /reject/i })
  }

  get rejectionReasonInput() {
    return this.page.getByRole('textbox', { name: /reason|comment/i })
  }

  get confirmActionButton() {
    return this.page.getByRole('button', { name: /confirm|yes|approve|reject/i }).last()
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async navigateToDashboard(): Promise<void> {
    await this.goto('/timesheets')
    await this.waitForLoadingToFinish()
  }

  async navigateToManagerView(): Promise<void> {
    await this.goto('/timesheets/manager')
    await this.waitForLoadingToFinish()
  }

  async navigateToTimesheet(id: number): Promise<void> {
    await this.goto(`/timesheets/${id}`)
    await this.waitForLoadingToFinish()
  }

  async openCurrentWeek(): Promise<void> {
    await this.openCurrentWeekButton.click()
    // Wait for navigation to the entry page
    await expect(this.page).toHaveURL(/\/timesheets\/\d+/)
    await this.waitForLoadingToFinish()
  }

  async submitCurrentTimesheet(): Promise<void> {
    await this.submitButton.click()
    // If a confirmation dialog appears, click confirm
    const confirm = this.confirmSubmitButton
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click()
    }
  }

  async approveTimesheet(): Promise<void> {
    await this.approveButton.click()
    const confirm = this.confirmActionButton
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click()
    }
  }

  async rejectTimesheet(reason: string): Promise<void> {
    await this.rejectButton.click()
    const input = this.rejectionReasonInput
    if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await input.fill(reason)
    }
    await this.confirmActionButton.click()
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async expectStatus(status: string): Promise<void> {
    // Status badge capitalisation varies (e.g. 'Draft' vs 'DRAFT') — match case-insensitively
    await expect(this.page.getByText(new RegExp(`^${status}$`, 'i')).first()).toBeVisible()
  }

  async expectOnEntryPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/timesheets\/\d+/)
  }

  async expectOnManagerView(): Promise<void> {
    await expect(this.page).toHaveURL(/\/timesheets\/manager/)
  }
}
