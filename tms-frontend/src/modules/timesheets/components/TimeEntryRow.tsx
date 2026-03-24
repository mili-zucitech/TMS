import { useEffect, useState } from 'react'
import { Check, Pencil, Trash2, X, Clock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import {
  calcDurationMinutes,
  formatDuration,
  stripSeconds,
  timesOverlap,
} from '../utils/timesheetHelpers'
import type { TimeEntryResponse, TimeEntryUpdateRequest } from '../types/timesheet.types'

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors disabled:opacity-50'

interface TimeEntryRowProps {
  entry: TimeEntryResponse
  allDayEntries: TimeEntryResponse[]   // all entries on the same day (for overlap check)
  projectNames: Record<number, string>
  taskNames: Record<number, string>
  projects: { id: number; name: string }[]
  tasks: { id: number; name: string; projectId: number }[]
  isEditable: boolean
  onUpdate: (id: number, payload: TimeEntryUpdateRequest) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

export function TimeEntryRow({
  entry,
  allDayEntries,
  projectNames,
  taskNames,
  projects,
  tasks,
  isEditable,
  onUpdate,
  onDelete,
}: TimeEntryRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [projectId, setProjectId] = useState(entry.projectId)
  const [taskId, setTaskId] = useState<number | ''>(entry.taskId ?? '')
  const [startTime, setStartTime] = useState(stripSeconds(entry.startTime))
  const [endTime, setEndTime] = useState(stripSeconds(entry.endTime))
  const [description, setDescription] = useState(entry.description ?? '')

  // Sync editable fields from the entry prop, but only when NOT actively
  // editing — prevents RTK Query cache refetches from wiping in-progress
  // edits mid-entry.
  useEffect(() => {
    if (isEditing) return
    setProjectId(entry.projectId)
    setTaskId(entry.taskId ?? '')
    setStartTime(stripSeconds(entry.startTime))
    setEndTime(stripSeconds(entry.endTime))
    setDescription(entry.description ?? '')
  }, [entry, isEditing])

  const filteredTasks = tasks.filter((t) => t.projectId === projectId)
  const durationMinutes =
    startTime && endTime ? calcDurationMinutes(startTime, endTime) : (entry.durationMinutes ?? 0)

  const handleSave = async () => {
    // Client-side validation
    if (!startTime || !endTime) {
      toast.error('Start and end time are required')
      return
    }
    if (startTime >= endTime) {
      toast.error('End time must be after start time')
      return
    }

    // Overlap check against other entries on same day (exclude self)
    const others = allDayEntries.filter((e) => e.id !== entry.id)
    const overlapping = others.find((e) =>
      timesOverlap(startTime, endTime, stripSeconds(e.startTime), stripSeconds(e.endTime)),
    )
    if (overlapping) {
      toast.error(
        `Time overlap with ${stripSeconds(overlapping.startTime)}–${stripSeconds(overlapping.endTime)}`,
      )
      return
    }

    setIsSaving(true)
    const ok = await onUpdate(entry.id, {
      projectId,
      taskId: taskId !== '' ? (taskId as number) : undefined,
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      description: description || undefined,
    })
    setIsSaving(false)
    if (ok) setIsEditing(false)
  }

  const handleCancel = () => {
    setProjectId(entry.projectId)
    setTaskId(entry.taskId ?? '')
    setStartTime(stripSeconds(entry.startTime))
    setEndTime(stripSeconds(entry.endTime))
    setDescription(entry.description ?? '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr className="border-b border-border/40 bg-primary/5">
        {/* Project */}
        <td className="px-3 py-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(Number(e.target.value)); setTaskId('') }}
            className={selectClass}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </td>
        {/* Task */}
        <td className="px-3 py-2">
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : '')}
            className={selectClass}
          >
            <option value="">— None —</option>
            {filteredTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </td>
        {/* Start Time */}
        <td className="px-3 py-2">
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 w-28"
          />
        </td>
        {/* End Time */}
        <td className="px-3 py-2">
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-9 w-28"
          />
        </td>
        {/* Duration */}
        <td className="px-3 py-2 text-center">
          <span className={cn(
            'inline-flex items-center gap-1 text-sm font-medium',
            durationMinutes > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}>
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(durationMinutes)}
          </span>
        </td>
        {/* Description */}
        <td className="px-3 py-2">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            className="h-9"
          />
        </td>
        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={handleSave}
              disabled={isSaving}
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors group">
      {/* Project */}
      <td className="px-3 py-2.5">
        <span className="text-sm">{projectNames[entry.projectId] ?? `#${entry.projectId}`}</span>
      </td>
      {/* Task */}
      <td className="px-3 py-2.5">
        <span className="text-sm text-muted-foreground">
          {entry.taskId
            ? (taskNames[entry.taskId] ?? `#${entry.taskId}`)
            : entry.taskNote
              ? <span className="italic">{entry.taskNote}</span>
              : '—'}
        </span>
      </td>
      {/* Start */}
      <td className="px-3 py-2.5">
        <span className="text-sm font-mono">{stripSeconds(entry.startTime)}</span>
      </td>
      {/* End */}
      <td className="px-3 py-2.5">
        <span className="text-sm font-mono">{stripSeconds(entry.endTime)}</span>
      </td>
      {/* Duration */}
      <td className="px-3 py-2.5 text-center">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(entry.durationMinutes ?? calcDurationMinutes(entry.startTime, entry.endTime))}
        </span>
      </td>
      {/* Description */}
      <td className="px-3 py-2.5 max-w-[200px]">
        <span className="text-sm text-muted-foreground truncate block">
          {entry.description || '—'}
        </span>
      </td>
      {/* Actions */}
      <td className="px-3 py-2.5">
        {isEditable && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsEditing(true)}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(entry.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}
