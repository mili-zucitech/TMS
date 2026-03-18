import { useEffect, useRef, useState } from 'react'
import { Handle, Position } from 'reactflow'
import { Mail, Briefcase, X, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { EmployeeSummary, EmployeeStatus } from '../types/organization.types'

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  ACTIVE:     'bg-emerald-100 text-emerald-700',
  INACTIVE:   'bg-slate-100 text-slate-600',
  ON_LEAVE:   'bg-amber-100 text-amber-700',
  SUSPENDED:  'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE:     'Active',
  INACTIVE:   'Inactive',
  ON_LEAVE:   'On Leave',
  SUSPENDED:  'Suspended',
  TERMINATED: 'Terminated',
}

export interface EmpFlowNodeData {
  employee: EmployeeSummary
}

export function EmpFlowNode({ data }: { data: EmpFlowNodeData }) {
  const { employee } = data
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-border !border-0 !w-2 !h-2" />

      <div ref={wrapperRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-[200px] flex-col gap-2.5 rounded-xl border bg-card p-3.5 shadow-sm text-left',
            'transition-all duration-200 hover:shadow-md',
            open
              ? 'border-emerald-400 shadow-emerald-200/60'
              : 'border-border hover:border-emerald-300',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm select-none">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <span className={cn('mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none', STATUS_STYLES[employee.status])}>
              {STATUS_LABEL[employee.status]}
            </span>
          </div>

          <div>
            <p className="truncate text-sm font-semibold leading-snug">{employee.name}</p>
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{employee.employeeId}</p>
          </div>

          {employee.designation && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
              <p className="truncate text-xs text-muted-foreground">{employee.designation}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="truncate text-xs text-muted-foreground">{employee.email}</p>
          </div>
        </button>

        {/* Details popover */}
        {open && (
          <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95 duration-150" style={{ top: '100%' }}>
            <div className="flex items-center justify-between gap-2 rounded-t-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white select-none">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{employee.name}</p>
                  <p className="text-[10px] font-mono text-white/70">{employee.employeeId}</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 hover:bg-white/25">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              {[
                { icon: Briefcase, label: 'Designation', value: employee.designation ?? '—' },
                { icon: Mail,      label: 'Email',       value: employee.email },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="break-all text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[employee.status])}>
                    {STATUS_LABEL[employee.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
