/**
 * Dashboard Page Object
 *
 * Encapsulates all interactions with the `/dashboard` page.
 */
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class DashboardPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────

  /** Top-level heading on the dashboard */
  get pageHeading() {
    return this.page.getByRole('heading', { level: 1 })
  }

  /** Navigation sidebar / header link */
  get navTimesheets() {
    return this.page.getByRole('link', { name: /timesheets/i }).first()
  }

  get navHolidays() {
    return this.page.getByRole('link', { name: /holidays/i }).first()
  }

  get navLeave() {
    return this.page.getByRole('link', { name: /leave/i }).first()
  }

  /** Logout button — could be in a user dropdown */
  get logoutButton() {
    // Matches "Log out", "Logout", "Sign out"
    return this.page.getByRole('button', { name: /log\s?out|sign\s?out/i })
  }

  /** User menu trigger (avatar / name in header) */
  get userMenuTrigger() {
    return this.page.getByRole('button', { name: /profile|account|user menu/i }).or(
      this.page.locator('[data-testid="user-menu-trigger"]'),
    )
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.goto('/dashboard')
    await this.waitForLoadingToFinish()
  }

  /** Open user menu and click Logout. */
  async logout(): Promise<void> {
    // Try direct logout button first, then via dropdown
    const direct = this.page.getByRole('button', { name: /log\s?out|sign\s?out/i })
    if (await direct.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await direct.click()
    } else {
      // Click the user avatar / menu trigger
      await this.page.locator('button').filter({ hasText: /^[A-Z]$/ }).last().click()
      await this.page.getByRole('menuitem', { name: /log\s?out|sign\s?out/i }).click()
    }
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async expectOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/)
  }

  async expectStatsVisible(): Promise<void> {
    // Dashboard should render at least some stat cards or content sections
    // We use a broad check since the exact card text depends on seeded data
    await expect(this.page.locator('main, [role="main"], #main-content').first()).toBeVisible()
  }
}
