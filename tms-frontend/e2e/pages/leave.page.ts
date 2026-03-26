/**
 * Leave Page Object
 *
 * Covers `/leave` (employee view) and `/leave/approvals` (manager view).
 */
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class LeavePage extends BasePage {
  // ── Locators — Employee Dashboard ───────────────────────────────────────────

  get applyLeaveButton() {
    return this.page.getByRole('button', { name: /apply|request leave|new leave/i })
  }

  get leaveTypeSelect() {
    return this.page.getByRole('dialog').getByRole('combobox', { name: /leave type/i }).or(
      this.page.getByRole('dialog').locator('select[name="leaveTypeId"]'),
    )
  }

  get startDateInput() {
    return this.page
      .getByRole('dialog')
      .getByLabel(/start date/i)
      .or(this.page.getByRole('dialog').locator('input[name="startDate"]'))
  }

  get endDateInput() {
    return this.page
      .getByRole('dialog')
      .getByLabel(/end date/i)
      .or(this.page.getByRole('dialog').locator('input[name="endDate"]'))
  }

  get reasonInput() {
    return this.page.getByRole('dialog').getByLabel(/reason/i)
  }

  get submitLeaveButton() {
    return this.page.getByRole('dialog').getByRole('button', { name: /submit|apply/i })
  }

  // ── Locators — Manager Approvals ─────────────────────────────────────────────

  get pendingLeaveRows() {
    return this.page.locator('tr, [data-testid="leave-row"]').filter({ hasText: /pending/i })
  }

  get firstApproveButton() {
    return this.page.getByRole('button', { name: /approve/i }).first()
  }

  get firstRejectButton() {
    return this.page.getByRole('button', { name: /reject/i }).first()
  }

  get rejectReasonInput() {
    return this.page.getByRole('dialog').getByLabel(/reason/i)
  }

  get confirmRejectButton() {
    return this.page.getByRole('dialog').getByRole('button', { name: /confirm|reject/i })
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async navigateToEmployeeView(): Promise<void> {
    await this.goto('/leave')
    await this.waitForLoadingToFinish()
  }

  async navigateToApprovals(): Promise<void> {
    await this.goto('/leave/approvals')
    await this.waitForLoadingToFinish()
  }

  async approveFirstPendingLeave(): Promise<void> {
    await this.firstApproveButton.click()
    const confirm = this.page.getByRole('button', { name: /confirm|yes/i }).last()
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click()
    }
  }

  async rejectFirstPendingLeave(reason: string): Promise<void> {
    await this.firstRejectButton.click()
    const input = this.rejectReasonInput
    if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await input.fill(reason)
    }
    await this.confirmRejectButton.click()
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async expectOnLeaveDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/leave(?!\/approvals)/)
  }

  async expectOnApprovals(): Promise<void> {
    await expect(this.page).toHaveURL(/\/leave\/approvals/)
  }

  async expectLeaveStatus(status: string): Promise<void> {
    await expect(this.page.getByText(status).first()).toBeVisible()
  }
}
