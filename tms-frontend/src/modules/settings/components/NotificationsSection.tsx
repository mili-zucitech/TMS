import { useState } from 'react'
import { Bell, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import settingsService from '../services/settingsService'
import type { NotificationPreferences } from '../types/settings.types'

interface PrefGroup {
  label: string
  items: { key: keyof NotificationPreferences; label: string; desc: string }[]
}

const PREF_GROUPS: PrefGroup[] = [
  {
    label: 'Timesheets',
    items: [
      { key: 'emailOnTimesheetApproved', label: 'Timesheet Approved', desc: 'Notify when your timesheet is approved' },
      { key: 'emailOnTimesheetRejected', label: 'Timesheet Rejected', desc: 'Notify when your timesheet is rejected' },
    ],
  },
  {
    label: 'Leave',
    items: [
      { key: 'emailOnLeaveApproved', label: 'Leave Approved',  desc: 'Notify when your leave request is approved' },
      { key: 'emailOnLeaveRejected', label: 'Leave Rejected',  desc: 'Notify when your leave request is rejected' },
    ],
  },
  {
    label: 'General',
    items: [
      { key: 'emailOnNewAssignment', label: 'New Assignment',      desc: 'Notify when you are assigned to a project or task' },
      { key: 'inAppNotifications',   label: 'In-App Notifications', desc: 'Show notification bell alerts inside the app' },
    ],
  },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    settingsService.getNotificationPrefs,
  )
  const [saving, setSaving] = useState(false)

  const setKey = (key: keyof NotificationPreferences, val: boolean) =>
    setPrefs((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    settingsService.saveNotificationPrefs(prefs)
    await new Promise((r) => setTimeout(r, 300))
    toast.success('Notification preferences saved')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          Notifications
        </CardTitle>
        <CardDescription>Choose which events you want to be notified about.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PREF_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="rounded-xl border border-border px-4">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={prefs[item.key]}
                    onChange={(v) => setKey(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving} className="gap-2">
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
