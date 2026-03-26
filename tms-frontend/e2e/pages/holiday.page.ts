/**
 * Holiday Page Object
 *
 * Encapsulates all interactions with the `/holidays` page.
 */
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class HolidayPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────

  get addHolidayButton() {
    // Matches "Add Holiday", "New Holiday", "+ Holiday"
    return this.page.getByRole('button', { name: /add holiday|new holiday|\+ holiday/i })
  }

  // ── Create modal fields ─────────────────────────────────────────────────────

  get holidayNameInput() {
    return this.page
      .getByRole('dialog')
      .getByLabel(/holiday name|name/i)
      .or(this.page.getByRole('dialog').locator('input[name="name"]'))
  }

  get holidayDateInput() {
    return this.page
      .getByRole('dialog')
      .getByLabel(/date/i)
      .or(this.page.getByRole('dialog').locator('input[type="date"], input[name="holidayDate"]'))
  }

  get holidayDescriptionInput() {
    return this.page
      .getByRole('dialog')
      .getByLabel(/description/i)
  }

  get createConfirmButton() {
    return this.page.getByRole('dialog').getByRole('button', { name: /create|save|add/i })
  }

  get dialogCancelButton() {
    return this.page.getByRole('dialog').getByRole('button', { name: /cancel/i })
  }

  // ── Delete modal ────────────────────────────────────────────────────────────

  get confirmDeleteButton() {
    return this.page.getByRole('button', { name: /confirm|yes|delete/i }).last()
  }

  // ── Table / List ────────────────────────────────────────────────────────────

  holidayRow(name: string) {
    return this.page.locator('tr, li, [data-testid]').filter({ hasText: name })
  }

  deleteButtonForHoliday(name: string) {
    return this.holidayRow(name).getByRole('button', { name: /delete|remove/i })
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.goto('/holidays')
    await this.waitForLoadingToFinish()
  }

  /**
   * Create a holiday through the UI.
   * @param name    Holiday name
   * @param date    ISO date string YYYY-MM-DD
   * @param description  Optional description
   */
  async createHoliday(name: string, date: string, description?: string): Promise<void> {
    await this.addHolidayButton.click()
    await this.holidayNameInput.fill(name)
    await this.holidayDateInput.fill(date)
    if (description) {
      await this.holidayDescriptionInput.fill(description)
    }
    await this.createConfirmButton.click()
    // Wait for dialog to close
    await expect(this.page.getByRole('dialog')).not.toBeAttached({ timeout: 10_000 }).catch(() => {
      // dialog may already be gone
    })
  }

  /** Click the delete button for a holiday and confirm the dialog. */
  async deleteHoliday(name: string): Promise<void> {
    await this.deleteButtonForHoliday(name).click()
    const confirmBtn = this.confirmDeleteButton
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  // ── View switching ──────────────────────────────────────────────────────────

  async switchToListView(): Promise<void> {
    const listBtn = this.page.getByRole('button', { name: /list/i })
    if (await listBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await listBtn.click()
    }
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async expectHolidayVisible(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 10_000 })
  }

  async expectHolidayNotVisible(name: string): Promise<void> {
    await expect(this.page.getByText(name)).not.toBeVisible()
  }

  async expectOnHolidayPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/holidays/)
  }
}
