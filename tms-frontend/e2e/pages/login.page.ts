/**
 * Login Page Object
 *
 * Encapsulates all interactions with the `/login` page.
 */
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────
  get emailInput() {
    return this.page.locator('input[name="email"]')
  }

  get passwordInput() {
    return this.page.locator('input[name="password"]')
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /sign in/i })
  }

  get errorAlert() {
    return this.page.getByRole('alert')
  }

  get loginForm() {
    return this.page.getByRole('form', { name: /login form/i })
  }

  get passwordToggleButton() {
    return this.page.getByRole('button', { name: /show|hide password/i })
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.goto('/login')
    await expect(this.emailInput).toBeVisible()
  }

  /** Fill the login form and submit. Does NOT wait for redirect. */
  async fillAndSubmit(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  /**
   * Full login flow — fills credentials, submits, and waits until
   * the browser navigates away from the login page.
   */
  async loginAs(email: string, password: string): Promise<void> {
    await this.navigate()
    await this.fillAndSubmit(email, password)
    // Wait for redirect to dashboard (or any non-login page)
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async expectErrorVisible(text?: string | RegExp): Promise<void> {
    await expect(this.errorAlert).toBeVisible()
    if (text) {
      await expect(this.errorAlert).toContainText(text)
    }
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/)
    await expect(this.emailInput).toBeVisible()
  }
}
