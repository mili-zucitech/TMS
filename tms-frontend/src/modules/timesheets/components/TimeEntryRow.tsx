import { useEffect, useState } from 'react'
import { Check, Pencil, Trash2, X, Clock, ChevronDown, ChevronUp, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AppSelect } from '@/components/ui/Select'
import { TimePicker12 } from './TimePicker12'
import { cn } from '@/utils/cn'
import {
  calcDurationMinutes,
  format12h,
  formatDuration,
  stripSeconds,
  timesOverlap,
} from '../utils/timesheetHelpers'
import type { TimeEntryResponse, TimeEntryUpdateRequest } from '../types/timesheet.types'

const labelClass = 'block text-xs font-medium text-muted-foreground mb-1'

interface TimeEntryRowProps {
  entry: TimeEntryResponse
  allDayEntries: TimeEntryResponse[]   // all entries on the same day (for overlap check)
  projectNames: Record<number, string>
  taskNames: Record<number, string>
  projects: { id: number; name: string }[]
  tasks: { id: number; name: string; projectId: number }[]
  isEditable: boolean
  isOvertime?: boolean
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
  isOvertime = false,
  onUpdate,
  onDelete,
}: TimeEntryRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const [projectId, setProjectId] = useState(entry.projectId)
  const [taskId, setTaskId] = useState<number | ''>(entry.taskId ?? '')
  const [taskNote, setTaskNote] = useState(entry.taskNote ?? '')
  const [taskInputMode, setTaskInputMode] = useState<'select' | 'type'>(
    entry.taskNote && !entry.taskId ? 'type' : 'select',
  )
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
    setTaskNote(entry.taskNote ?? '')
    setTaskInputMode(entry.taskNote && !entry.taskId ? 'type' : 'select')
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
      taskId: taskInputMode === 'select' && taskId !== '' ? (taskId as number) : undefined,
      taskNote: taskInputMode === 'type' && taskNote.trim() ? taskNote.trim() : undefined,
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
    setTaskNote(entry.taskNote ?? '')
    setTaskInputMode(entry.taskNote && !entry.taskId ? 'type' : 'select')
    setStartTime(stripSeconds(entry.startTime))
    setEndTime(stripSeconds(entry.endTime))
    setDescription(entry.description ?? '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr>
        <td colSpan={7} className="px-3 pb-4 pt-2">
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">
              Edit Entry
            </p>

            {/* ── Labeled field grid ───────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Project */}
              <div>
                <label className={labelClass}>
                  Project <span className="text-destructive">*</span>
                </label>
                <AppSelect
                  value={projectId}
                  onChange={(v) => { setProjectId(v as number); setTaskId('') }}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  autoFocus
                  size="sm"
                />
              </div>

              {/* Task (select OR type) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={cn(labelClass, 'mb-0')}>Task</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTaskInputMode((m) => (m === 'select' ? 'type' : 'select'))
                      setTaskId('')
                      setTaskNote('')
                    }}
                    className="text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
                  >
                    {taskInputMode === 'select' ? '✏️ Type instead' : '📋 Choose instead'}
                  </button>
                </div>
                {taskInputMode === 'select' ? (
                  <AppSelect
                    value={taskId}
                    onChange={(v) => setTaskId(v !== '' ? v as number : '')}
                    options={[{ value: '', label: '— None —' }, ...filteredTasks.map((t) => ({ value: t.id, label: t.name }))]}
                    placeholder="— None —"
                    size="sm"
                  />
                ) : (
                  <Input
                    value={taskNote}
                    onChange={(e) => setTaskNote(e.target.value)}
                    placeholder="Type task name…"
                    className="h-9"
                  />
                )}
              </div>

              {/* Start Time */}
              <div>
                <label className={labelClass}>
                  Start Time <span className="text-destructive">*</span>
                </label>
                <TimePicker12
                  value={startTime}
                  onChange={setStartTime}
                />
              </div>

              {/* End Time */}
              <div>
                <label className={labelClass}>
                  End Time <span className="text-destructive">*</span>
                </label>
                <TimePicker12
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>

              {/* Description — full width */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                <label className={labelClass}>
                  <AlignLeft className="inline h-3 w-3 mr-1 -mt-0.5" />
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What did you work on? (optional)"
                  rows={3}
                  className={
                    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
                    'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
                    'focus:ring-offset-1 transition-colors resize-none'
                  }
                />
              </div>

            </div>

            {/* ── Footer: computed duration + actions ─────────────── */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-medium',
                  durationMinutes > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground',
                )}
              >
                <Clock className="h-4 w-4" />
                {durationMinutes > 0 ? formatDuration(durationMinutes) : 'Duration will appear here'}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground hover:text-foreground"
                  onClick={handleCancel}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>

          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={cn(
      'border-b border-border/40 hover:bg-muted/20 transition-colors group',
      isOvertime && 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]',
    )}>
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
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-sm font-mono">{format12h(entry.startTime)}</span>
      </td>
      {/* End */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-sm font-mono">{format12h(entry.endTime)}</span>
      </td>
      {/* Duration */}
      <td className="px-3 py-2.5 text-center whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(entry.durationMinutes ?? calcDurationMinutes(entry.startTime, entry.endTime))}
        </span>
      </td>
      {/* Description */}
      <td className="px-3 py-2.5 max-w-[220px]">
        {entry.description ? (
          descriptionExpanded || entry.description.length <= 55 ? (
            <span className="text-sm text-muted-foreground break-words">
              {entry.description}
              {entry.description.length > 55 && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded(false)}
                    className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary text-xs underline underline-offset-2"
                  >
                    less <ChevronUp className="h-3 w-3" />
                  </button>
                </>
              )}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {entry.description.slice(0, 55)}&hellip;{' '}
              <button
                type="button"
                onClick={() => setDescriptionExpanded(true)}
                className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary text-xs underline underline-offset-2"
              >
                more <ChevronDown className="h-3 w-3" />
              </button>
            </span>
          )
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
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
