// ── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileUpdateRequest {
  name: string
  phone?: string
  designation?: string
}

// ── Password Change ───────────────────────────────────────────────────────────

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ── Notification Preferences (stored locally) ─────────────────────────────────

export interface NotificationPreferences {
  emailOnTimesheetApproved: boolean
  emailOnTimesheetRejected: boolean
  emailOnLeaveApproved: boolean
  emailOnLeaveRejected: boolean
  emailOnNewAssignment: boolean
  inAppNotifications: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  emailOnTimesheetApproved: true,
  emailOnTimesheetRejected: true,
  emailOnLeaveApproved: true,
  emailOnLeaveRejected: true,
  emailOnNewAssignment: true,
  inAppNotifications: true,
}

// ── Appearance ────────────────────────────────────────────────────────────────

export type ThemeSetting = 'light' | 'dark' | 'system'

export interface AppearanceSettings {
  theme: ThemeSetting
  compactMode: boolean
  sidebarCollapsed: boolean
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'light',
  compactMode: false,
  sidebarCollapsed: false,
}
