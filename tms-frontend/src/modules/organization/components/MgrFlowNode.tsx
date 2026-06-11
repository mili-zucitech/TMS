import { Handle, Position } from 'reactflow'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { HierarchyMember } from '../types/organization.types'

// ── Role badge colours ────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  MANAGER:    'Manager',
  HR_MANAGER: 'HR Manager',
  DIRECTOR:   'Director',
  ADMIN:      'Admin',
  HR:         'HR',
  EMPLOYEE:   'Employee',
}

export interface MgrFlowNodeData {
  user: HierarchyMember
  reportCount: number
  collapsed: boolean
  nodeId: string
  onToggle: (nodeId: string, collapsed: boolean) => void
}

export function MgrFlowNode({ data }: { data: MgrFlowNodeData }) {
  const { user, reportCount, collapsed, nodeId, onToggle } = data
  const roleLabel = ROLE_LABEL[user.roleName] ?? user.roleName

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !border-0 !w-2 !h-2" />

      <button
        onClick={() => reportCount > 0 && onToggle(nodeId, !collapsed)}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'group flex w-[220px] flex-col gap-0 rounded-xl border text-left overflow-hidden nopan',
          'bg-card shadow-md transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
          reportCount > 0
            ? 'hover:shadow-lg hover:border-indigo-400/50 border-indigo-300/30 cursor-pointer'
            : 'border-border cursor-default',
        )}
      >
        {/* Colour stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

        <div className="flex flex-col gap-2.5 p-3.5">
          {/* Header row: avatar + toggle chevron */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm select-none">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {reportCount > 0 && (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                {collapsed
                  ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                }
              </div>
            )}
          </div>

          {/* Name + ID */}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-snug">{user.name}</p>
            {user.designation && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.designation}</p>
            )}
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{user.employeeId}</p>
          </div>

          {/* Role badge + reports count */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              'inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400',
            )}>
              {roleLabel}
            </span>
            {reportCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Users className="h-2.5 w-2.5" />
                {reportCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {reportCount > 0 && !collapsed && (
        <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !border-0 !w-2 !h-2" />
      )}
    </>
  )
}
