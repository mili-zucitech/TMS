import { useState } from 'react'
import { Palette, Monitor, Moon, Sun, Save, Layout } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useTheme } from '@/components/theme/theme-provider'
import { cn } from '@/utils/cn'
import settingsService from '../services/settingsService'
import type { ThemeSetting } from '../types/settings.types'

const THEME_OPTIONS: { value: ThemeSetting; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Clean light interface' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: Monitor, desc: 'Follows OS setting' },
]

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const saved = settingsService.getAppearanceSettings()

  const [compactMode, setCompactMode] = useState(saved.compactMode)
  const [saving, setSaving] = useState(false)

  const handleThemeChange = (t: ThemeSetting) => {
    setTheme(t)
  }

  const handleSave = async () => {
    setSaving(true)
    settingsService.saveAppearanceSettings({ theme: theme as ThemeSetting, compactMode, sidebarCollapsed: false })
    await new Promise((r) => setTimeout(r, 300)) // small UX delay
    toast.success('Appearance preferences saved')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4 text-primary" />
          Appearance
        </CardTitle>
        <CardDescription>Customize the look and feel of the interface.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme picker */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Color Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = theme === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleThemeChange(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center text-sm transition-all',
                    active
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-muted/30',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Display options */}
        <div className="space-y-1">
          <p className="text-sm font-medium flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Display Options
          </p>
          <div className="rounded-xl border border-border px-4">
            <ToggleRow
              label="Compact Mode"
              description="Reduce padding and spacing for a denser layout"
              checked={compactMode}
              onChange={setCompactMode}
            />
          </div>
        </div>

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
