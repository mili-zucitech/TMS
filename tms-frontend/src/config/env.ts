/**
 * Central application configuration.
 *
 * All runtime config values are read from Vite's `import.meta.env` in ONE place.
 * Import from this file everywhere instead of reading `import.meta.env` directly.
 *
 * Local  → .env             (VITE_API_BASE_URL=http://localhost:8080/api/v1)
 * Prod   → .env.production  (VITE_API_BASE_URL=https://api.yourdomain.com/api/v1)
 * Custom → .env.local        (git-ignored personal overrides, highest priority)
 */

export const config = {
  /** Backend REST API base URL — no trailing slash. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',

  /** Human-readable application name. */
  appName: import.meta.env.VITE_APP_NAME ?? 'TMS',

  /** Current environment ("development" | "production" | "test"). */
  appEnv: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,

  /** Convenience flags. */
  isDev:  import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export type AppConfig = typeof config
