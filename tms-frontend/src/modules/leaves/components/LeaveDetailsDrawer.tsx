import { X, CalendarRange, User2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import type { LeaveRequestResponse } from '../types/leave.types'
import { LEAVE_STATUS_CONFIG } from './leaveConfig'

// ── Props ─────────────────────────────────────────────────────

interface LeaveDetailsDrawerProps {
  leave: LeaveRequestResponse | null
  open: boolean
  onClose: () => void
  /** Manager/Admin: approve action */
  onApprove?: (leave: LeaveRequestResponse) => void
  /** Manager/Admin: reject action */
  onReject?: (leave: LeaveRequestResponse) => void
  /** Employee: cancel action */
  onCancel?: (leave: LeaveRequestResponse) => void
}

// ── Component ────────────────────────────────────────────────

export function LeaveDetailsDrawer({
  leave,
  open,
  onClose,
  onApprove,
  onReject,
  onCancel,
}: LeaveDetailsDrawerProps) {
  if (!leave) return null
  const cfg = LEAVE_STATUS_CONFIG[leave.status]

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background border-l border-border shadow-2xl',
          'flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Leave Details</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
                cfg.badgeClass,
              )}
            >
              <span className={cn('h-2 w-2 rounded-full mr-2', cfg.dotClass)} />
              {cfg.label}
            </span>
            {leave.status === 'PENDING' && (
              <span className="text-xs text-muted-foreground">Awaiting review</span>
            )}
          </div>

          {/* Leave Type & Duration */}
          <Section title="Leave Information">
            <Row label="Leave Type" value={leave.leaveTypeName} />
            <Row label="Start Date" value={fmtDate(leave.startDate)} />
            <Row label="End Date" value={fmtDate(leave.endDate)} />
            <Row
              label="Duration"
              value={
                <span className="font-semibold text-primary">
                  {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                </span>
              }
            />
            <Row
              label="Applied On"
              value={<span className="tabular-nums">{fmtDateTime(leave.appliedAt)}</span>}
            />
          </Section>

          {/* Employee */}
          <Section title="Employee">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-mono text-sm text-muted-foreground">{leave.userId}</span>
            </div>
          </Section>

          {/* Reason */}
          {leave.reason && (
            <Section title="Reason for Leave">
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                {leave.reason}
              </p>
            </Section>
          )}

          {/* Approval info */}
          {leave.status === 'APPROVED' && (
            <Section title="Approval">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Approved
                {leave.approvedAt && ` on ${fmtDateTime(leave.approvedAt)}`}
              </div>
              {leave.approvedBy && (
                <p className="text-xs text-muted-foreground mt-1">By: {leave.approvedBy}</p>
              )}
            </Section>
          )}

          {/* Rejection reason */}
          {leave.status === 'REJECTED' && leave.rejectionReason && (
            <Section title="Rejection Reason">
              <div className="flex gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{leave.rejectionReason}</p>
              </div>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        {(onApprove || onReject || onCancel) && leave.status === 'PENDING' && (
          <div className="border-t border-border p-4 flex gap-2">
            {onApprove && (
              <Button
                className="flex-1"
                onClick={() => { onApprove(leave); onClose() }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => { onReject(leave); onClose() }}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            )}
            {onCancel && (
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => { onCancel(leave); onClose() }}
              >
                Cancel Request
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Section / Row helpers ─────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
