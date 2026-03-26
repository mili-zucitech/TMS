import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for TMS.
 *
 * Local:  npx playwright test  (reuses already-running dev server by default)
 * CI:     npm run e2e:ci       (starts frontend automatically via webServer)
 *
 * Backend must be running at PLAYWRIGHT_API_URL (default http://localhost:8080/api/v1).
 * Frontend must be running at PLAYWRIGHT_BASE_URL (default http://localhost:5173).
 *
 * @see https://playwright.dev/docs/test-configuration
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',

  /* Run all tests in parallel, but keep it serial in CI to avoid flakiness
     on shared test data / shared database */
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,

  /* Fail the build on any test.only left in source */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests once in CI */
  retries: process.env.CI ? 2 : 0,

  /* Reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(process.env.CI ? ([['github']] as const) : []),
  ],

  /* Shared settings for every test */
  use: {
    baseURL: BASE_URL,

    /* Capture traces / screenshots / videos on the first retry */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Generous but bounded timeouts */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results',

  /* ── Projects ────────────────────────────────────────────────────────────── */
  projects: [
    // 1. Auth-setup project — runs once, saves stored auth state to disk
    {
      name: 'setup',
      testMatch: /setup\/.*\.setup\.ts/,
    },

    // 2. Main browser project — depends on auth setup, reuses stored state
    {
      name: 'chromium',
      testMatch: /tests\/(?!auth).*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    // 3. Unauthenticated project — for login / logout tests that must start
    //    without a session
    {
      name: 'chromium-unauth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/auth\.spec\.ts/,
    },
  ],

  /* ── Web server ──────────────────────────────────────────────────────────── */
  // Only auto-start the Vite dev server when explicitly requested (e.g. CI).
  // For local development you should start the server yourself with `npm run dev`.
  webServer: process.env.PLAYWRIGHT_START_SERVER
    ? [
        {
          command: 'npm run dev',
          url: BASE_URL,
          reuseExistingServer: false,
          timeout: 60_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ]
    : undefined,
})
