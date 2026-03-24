import { useEffect, useRef, useState } from 'react'
import { Plus, X, Clock, Check, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import {
  calcDurationMinutes,
  formatDuration,
  timesOverlap,
  stripSeconds,
} from '../utils/timesheetHelpers'
import type { TimeEntryResponse, TimeEntryCreateRequest } from '../types/timesheet.types'

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors disabled:opacity-50'

const labelClass = 'block text-xs font-medium text-muted-foreground mb-1'

interface AddEntryRowProps {
  workDate: string
  timesheetId: number
  userId: string
  existingEntries: TimeEntryResponse[]
  projects: { id: number; name: string }[]
  tasks: { id: number; name: string; projectId: number }[]
  onSave: (payload: TimeEntryCreateRequest) => Promise<TimeEntryResponse | null>
}

export function AddEntryRow({
  workDate,
  timesheetId,
  userId,
  existingEntries,
  projects,
  tasks,
  onSave,
}: AddEntryRowProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [taskInputMode, setTaskInputMode] = useState<'select' | 'type'>('select')

  const [projectId, setProjectId] = useState<number | ''>(projects[0]?.id ?? '')
  const [taskId, setTaskId] = useState<number | ''>('')
  const [taskNote, setTaskNote] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')

  // Reset form only when the panel transitions from closed → open.
  // Excluding `projects` from deps prevents mid-entry resets caused by
  // parent re-renders that produce a new array reference.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setProjectId(projects[0]?.id ?? '')
      setTaskId('')
      setTaskNote('')
      setTaskInputMode('select')
      setStartTime('')
      setEndTime('')
      setDescription('')
    }
    wasOpenRef.current = open
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTasks = tasks.filter((t) => t.projectId === Number(projectId))
  const durationMinutes =
    startTime && endTime ? calcDurationMinutes(startTime, endTime) : 0

  const toggleTaskMode = () => {
    setTaskInputMode((m) => (m === 'select' ? 'type' : 'select'))
    setTaskId('')
    setTaskNote('')
  }

  const handleSave = async () => {
    if (projectId === '') { toast.error('Select a project'); return }
    if (!startTime || !endTime) { toast.error('Start and end time are required'); return }
    if (startTime >= endTime) { toast.error('End time must be after start time'); return }

    const dayTotal = existingEntries.reduce(
      (sum, e) => sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
      0,
    )
    if (dayTotal + durationMinutes > 24 * 60) {
      toast.error('Cannot exceed 24 hours in a single day')
      return
    }

    const overlapping = existingEntries.find((e) =>
      timesOverlap(startTime, endTime, stripSeconds(e.startTime), stripSeconds(e.endTime)),
    )
    if (overlapping) {
      toast.error(
        `Time overlap with ${stripSeconds(overlapping.startTime)}–${stripSeconds(overlapping.endTime)}`,
      )
      return
    }

    setIsSaving(true)
    const result = await onSave({
      timesheetId,
      projectId: projectId as number,
      taskId: taskInputMode === 'select' && taskId !== '' ? (taskId as number) : undefined,
      taskNote: taskInputMode === 'type' && taskNote.trim() ? taskNote.trim() : undefined,
      userId,
      workDate,
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      description: description || undefined,
    })
    setIsSaving(false)
    if (result) setOpen(false)
  }

  if (!open) {
    return (
      <tr>
        <td colSpan={7} className="px-3 py-1.5">
          <button
            onClick={() => setOpen(true)}
            className={cn(
              'flex items-center gap-1.5 text-xs text-muted-foreground',
              'hover:text-primary transition-colors rounded-md px-2 py-1',
              'hover:bg-primary/5',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add entry
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={7} className="px-3 pb-4 pt-2">
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">
            New Entry
          </p>

          {/* ── Labeled field grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Project */}
            <div>
              <label className={labelClass}>
                Project <span className="text-destructive">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(Number(e.target.value)); setTaskId('') }}
                className={selectClass}
                autoFocus
              >
                <option value="">— Select project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Task (select OR type) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={cn(labelClass, 'mb-0')}>Task</label>
                <button
                  type="button"
                  onClick={toggleTaskMode}
                  className="text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
                >
                  {taskInputMode === 'select' ? '✏️ Type instead' : '📋 Choose instead'}
                </button>
              </div>
              {taskInputMode === 'select' ? (
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
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9 w-full"
              />
            </div>

            {/* End Time */}
            <div>
              <label className={labelClass}>
                End Time <span className="text-destructive">*</span>
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9 w-full"
              />
            </div>

            {/* Description — full width */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4">
              <label className={labelClass}>
                <AlignLeft className="inline h-3 w-3 mr-1 -mt-0.5" />
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on? (optional)"
                className="h-9"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
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
                onClick={() => setOpen(false)}
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
                {isSaving ? 'Saving…' : 'Save Entry'}
              </Button>
            </div>
          </div>

        </div>
      </td>
    </tr>
  )
}

