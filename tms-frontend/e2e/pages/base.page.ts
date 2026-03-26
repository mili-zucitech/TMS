/**
 * Base Page Object — holds the Playwright `Page` instance and provides
 * shared navigation helpers used by every page object.
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to an absolute or relative URL and wait for network idle. */
  async goto(path: string): Promise<void> {
    await this.page.goto(path)
  }

  /** Current URL of the page. */
  get url(): string {
    return this.page.url()
  }

  /** Wait until the URL matches the given path segment. */
  async waitForPath(segment: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(segment))
  }

  /** Dismiss any visible toast/notification by pressing Escape. */
  async dismissToast(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  /**
   * Wait for a loading indicator (spinner / skeleton / loading text)
   * to disappear before asserting content.
   */
  async waitForLoadingToFinish(): Promise<void> {
    // Wait for any Tailwind animate-pulse skeletons to disappear
    const skeleton = this.page.locator('.animate-pulse')
    if (await skeleton.count() > 0) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 })
    }
  }

  /** Click a button identified by its visible text (case-insensitive). */
  async clickButton(label: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name: label }).click()
  }
}
