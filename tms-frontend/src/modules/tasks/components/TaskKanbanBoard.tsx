import { useState, useRef } from 'react'
import { CalendarDays, GripVertical, User2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/utils/cn'
import taskService from '../services/taskService'
import { TaskPriorityBadge } from './TaskPriorityBadge'
import type { TaskResponse, TaskStatus } from '../types/task.types'

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  {
    status: 'TODO',
    label: 'To Do',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-500/8 border-slate-500/20',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-500/8 border-blue-500/20',
  },
  {
    status: 'IN_REVIEW',
    label: 'In Review',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-500/8 border-amber-500/20',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-500/8 border-emerald-500/20',
  },
  {
    status: 'BLOCKED',
    label: 'Blocked',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-500/8 border-red-500/20',
  },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Draggable task card ────────────────────────────────────────────────────────
interface KanbanCardProps {
  task: TaskResponse
  userNames: Record<string, string>
  onDragStart: (e: React.DragEvent, task: TaskResponse) => void
  onClick: (task: TaskResponse) => void
}

function KanbanCard({ task, userNames, onDragStart, onClick }: KanbanCardProps) {
  const isOverdue =
    task.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date()

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
      className={cn(
        'group rounded-xl border border-border bg-card p-3 shadow-sm',
        'cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-border/80 transition-all duration-150',
        'select-none',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70 mt-0.5" />
      </div>

      {/* Task code */}
      <p className="text-xs font-mono text-muted-foreground mb-2">{task.taskCode}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <TaskPriorityBadge priority={task.priority} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50">
        {task.dueDate ? (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}
          >
            <CalendarDays className="h-3 w-3 shrink-0" />
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <span />
        )}

        {task.assignedUserId ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[100px]"
            title={userNames[task.assignedUserId]}
          >
            <User2 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {userNames[task.assignedUserId]?.split(' ')[0] ?? '…'}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">Unassigned</span>
        )}
      </div>
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────
interface KanbanColumnProps {
  status: TaskStatus
  label: string
  color: string
  bg: string
  tasks: TaskResponse[]
  userNames: Record<string, string>
  isDragOver: boolean
  onDragStart: (e: React.DragEvent, task: TaskResponse) => void
  onDragOver: (e: React.DragEvent, status: TaskStatus) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, status: TaskStatus) => void
  onCardClick: (task: TaskResponse) => void
}

function KanbanColumn({
  status,
  label,
  color,
  bg,
  tasks,
  userNames,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardClick,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col min-w-[270px] max-w-[310px] flex-shrink-0 rounded-2xl border p-3 transition-colors duration-150',
        bg,
        isDragOver && 'ring-2 ring-primary/40 bg-primary/5',
      )}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', color)}>{label}</span>
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5',
              'text-xs font-semibold bg-background border border-border text-muted-foreground',
            )}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 min-h-[80px]">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            userNames={userNames}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground/40 text-xs">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Board ────────────────────────────────────────────────────────────────
interface TaskKanbanBoardProps {
  tasks: TaskResponse[]
  userNames: Record<string, string>
  canUpdateStatus: boolean
  onTaskClick: (task: TaskResponse) => void
  onStatusChanged: () => void
}

export function TaskKanbanBoard({
  tasks,
  userNames,
  canUpdateStatus,
  onTaskClick,
  onStatusChanged,
}: TaskKanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const draggedTask = useRef<TaskResponse | null>(null)

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status)

  const handleDragStart = (e: React.DragEvent, task: TaskResponse) => {
    draggedTask.current = task
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const task = draggedTask.current
    draggedTask.current = null

    if (!task) return
    if (task.status === newStatus) return
    if (!canUpdateStatus) {
      toast.error('You do not have permission to change task status')
      return
    }

    try {
      await taskService.updateTaskStatus(task.id, { status: newStatus })
      toast.success(`Task moved to ${COLUMNS.find((c) => c.status === newStatus)?.label}`)
      onStatusChanged()
    } catch {
      toast.error('Failed to update task status')
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            bg={col.bg}
            tasks={tasksByStatus(col.status)}
            userNames={userNames}
            isDragOver={dragOverColumn === col.status}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onCardClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  )
}
