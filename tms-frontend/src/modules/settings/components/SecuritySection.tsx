import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import settingsService from '../services/settingsService'

const MIN_PASSWORD_LEN = 8

function PasswordInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ── Password strength meter ───────────────────────────────────────────────────
function strengthLevel(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: 'Weak',   color: 'bg-red-500' }
  if (score <= 2) return { level: 2, label: 'Fair',   color: 'bg-amber-500' }
  if (score <= 3) return { level: 3, label: 'Good',   color: 'bg-yellow-500' }
  if (score <= 4) return { level: 4, label: 'Strong', color: 'bg-emerald-500' }
  return              { level: 5, label: 'Very Strong', color: 'bg-emerald-600' }
}

export function SecuritySection() {
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)

  const strength = strengthLevel(next)
  const mismatch = confirm.length > 0 && next !== confirm

  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_PASSWORD_LEN &&
    next === confirm &&
    !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      await settingsService.changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm })
      toast.success('Password changed successfully')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch {
      toast.error('Failed to change password. Check your current password and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Security
        </CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <PasswordInput
            label="Current Password"
            value={current}
            onChange={setCurrent}
          />
          <PasswordInput
            label="New Password"
            value={next}
            onChange={setNext}
            hint={`Minimum ${MIN_PASSWORD_LEN} characters.`}
          />

          {/* Strength meter */}
          {next.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength.level ? strength.color : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-xs text-muted-foreground">
                  Strength: <span className="font-medium">{strength.label}</span>
                </p>
              )}
            </div>
          )}

          <PasswordInput
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
          />
          {mismatch && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={!canSubmit} loading={saving} className="gap-2">
              <Save className="h-4 w-4" />
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
