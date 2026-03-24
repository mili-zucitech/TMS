import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { config } from '@/config/env'

interface InfoRowProps { label: string; value: string }
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-right">{value}</p>
    </div>
  )
}

export function AboutSection() {
  const { user } = useAuth()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" />
          About
        </CardTitle>
        <CardDescription>System information and your account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System info */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System</p>
          <div className="rounded-xl border border-border px-4">
            <InfoRow label="Application"  value="Enterprise Timesheet Management System" />
            <InfoRow label="Version"      value="1.0.0" />
            <InfoRow label="Environment"  value={config.isProd ? 'Production' : 'Development'} />
            <InfoRow label="API Base URL" value={config.apiBaseUrl} />
          </div>
        </div>

        {/* Session info */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Session</p>
          <div className="rounded-xl border border-border px-4">
            <InfoRow label="Signed in as"  value={user?.email ?? '—'} />
            <InfoRow
              label="Role"
              value={user?.roleName ? user.roleName.replace('_', ' ') : '—'}
            />
            <InfoRow label="User ID"       value={user?.userId ?? '—'} />
            <InfoRow
              label="Local Time"
              value={new Date().toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            />
            <InfoRow
              label="Timezone"
              value={Intl.DateTimeFormat().resolvedOptions().timeZone}
            />
          </div>
        </div>

        {/* Tech stack */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technology Stack</p>
          <div className="flex flex-wrap gap-2">
            {['React 18', 'TypeScript', 'Tailwind CSS', 'Spring Boot 3', 'PostgreSQL', 'JWT Auth'].map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
