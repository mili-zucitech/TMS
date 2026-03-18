import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  ProfileUpdateRequest,
  ChangePasswordRequest,
  NotificationPreferences,
  AppearanceSettings,
} from '../types/settings.types'

const NOTIF_PREFS_KEY = 'tms_notif_prefs'
const APPEARANCE_KEY  = 'tms_appearance'

const settingsService = {
  // ── Profile ──────────────────────────────────────────────────────────────
  async updateProfile(userId: string, payload: ProfileUpdateRequest): Promise<void> {
    await axiosClient.put<ApiResponse<unknown>>(`/users/${userId}`, payload)
  },

  // ── Password ─────────────────────────────────────────────────────────────
  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await axiosClient.post<ApiResponse<unknown>>('/auth/change-password', {
      currentPassword: payload.currentPassword,
      newPassword:     payload.newPassword,
    })
  },

  // ── Notification preferences (localStorage) ───────────────────────────────
  getNotificationPrefs(): NotificationPreferences {
    try {
      const raw = localStorage.getItem(NOTIF_PREFS_KEY)
      if (raw) return JSON.parse(raw) as NotificationPreferences
    } catch { /* ignore */ }
    return { ...({ emailOnTimesheetApproved: true, emailOnTimesheetRejected: true, emailOnLeaveApproved: true, emailOnLeaveRejected: true, emailOnNewAssignment: true, inAppNotifications: true }) }
  },

  saveNotificationPrefs(prefs: NotificationPreferences): void {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs))
  },

  // ── Appearance settings (localStorage) ───────────────────────────────────
  getAppearanceSettings(): AppearanceSettings {
    try {
      const raw = localStorage.getItem(APPEARANCE_KEY)
      if (raw) return JSON.parse(raw) as AppearanceSettings
    } catch { /* ignore */ }
    return { theme: 'light', compactMode: false, sidebarCollapsed: false }
  },

  saveAppearanceSettings(settings: AppearanceSettings): void {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings))
  },
}

export default settingsService
