import { Handle, Position } from 'reactflow'
import { Building2, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface DeptFlowNodeData {
  name: string
  description: string | null
  employeeCount: number
  onToggle: (id: string, collapsed: boolean) => void
  collapsed: boolean
  nodeId: string
}

export function DeptFlowNode({ data }: { data: DeptFlowNodeData }) {
  const { name, description, employeeCount, onToggle, collapsed, nodeId } = data

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-emerald-400 !border-0 !w-2 !h-2" />

      <button
        onClick={() => onToggle(nodeId, !collapsed)}
        className={cn(
          'group flex w-[220px] flex-col gap-2 rounded-xl border p-4 text-left',
          'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25',
          'transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
            {collapsed
              ? <ChevronRight className="h-3 w-3 text-white" />
              : <ChevronDown className="h-3 w-3 text-white" />
            }
          </div>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug">{name}</p>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-white/70 leading-snug">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5">
          <Users className="h-3 w-3 text-white/80" />
          <span className="text-xs font-medium text-white/90">
            {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
          </span>
        </div>
      </button>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !border-0 !w-2 !h-2" />
    </>
  )
}
