import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { cn } from '@/utils/cn'
import type { UserResponse, UserUpdateRequest } from '../types/user.types'

// ── Zod schema ────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  phone: z.string().max(20, 'Max 20 characters').optional().or(z.literal('')),
  designation: z.string().max(100, 'Max 100 characters').optional().or(z.literal('')),
  roleName: z.enum(['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR', 'EMPLOYEE'] as const).optional().or(z.literal('')),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const)
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'] as const)
    .optional()
    .or(z.literal('')),
  joiningDate: z.string().optional().or(z.literal('')),
  departmentId: z.coerce.number().positive().optional().or(z.literal('')),
  managerId: z.string().uuid('Must be a valid user ID').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────
interface UserEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserResponse | null
  onSubmit: (id: string, data: UserUpdateRequest) => Promise<boolean>
  departments?: { id: number; name: string }[]
  users?: { id: string; name: string; employeeId: string; roleName: string }[]
}

const fieldClass = 'space-y-1.5'
const errorClass = 'text-xs text-destructive mt-1'
const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors disabled:opacity-50'

// ── Component ─────────────────────────────────────────────────
export function UserEditModal({ open, onOpenChange, user, onSubmit, departments = [], users = [] }: UserEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Prefill when user changes
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone: user.phone ?? '',
        designation: user.designation ?? '',
        roleName: user.roleName,
        employmentType: user.employmentType ?? '',
        status: user.status,
        joiningDate: user.joiningDate ?? '',
        departmentId: user.departmentId ?? '',
        managerId: user.managerId ?? '',
      })
    }
  }, [user, reset])

  const handleFormSubmit = async (values: FormValues) => {
    if (!user) return
    const payload: UserUpdateRequest = {
      name: values.name,
      ...(values.phone !== '' && { phone: values.phone }),
      ...(values.designation !== '' && { designation: values.designation }),
      ...(values.roleName
        ? { roleName: values.roleName as UserUpdateRequest['roleName'] }
        : {}),
      ...(values.employmentType
        ? { employmentType: values.employmentType as UserUpdateRequest['employmentType'] }
        : {}),
      ...(values.status
        ? { status: values.status as UserUpdateRequest['status'] }
        : {}),
      ...(values.joiningDate && values.joiningDate !== '' ? { joiningDate: values.joiningDate } : {}),
      ...(values.departmentId && typeof values.departmentId === 'number'
        ? { departmentId: values.departmentId }
        : {}),
      ...(values.managerId ? { managerId: values.managerId } : {}),
    }
    const ok = await onSubmit(user.id, payload)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 mb-1">
            <Pencil className="h-4 w-4 text-white" />
          </div>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the details for{' '}
            <span className="font-medium text-foreground">{user?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className={cn(fieldClass, 'sm:col-span-2')}>
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                placeholder="John Doe"
                error={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            {/* Role */}
            <div className={fieldClass}>
              <Label htmlFor="edit-roleName">Role</Label>
              <select
                id="edit-roleName"
                className={selectClass}
                {...register('roleName')}
              >
                <option value="">No change</option>
                <option value="ADMIN">Admin</option>
                <option value="HR">HR</option>
                <option value="HR_MANAGER">HR Manager</option>
                <option value="MANAGER">Manager</option>
                <option value="DIRECTOR">Director</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>

            {/* Status */}
            <div className={fieldClass}>
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                className={selectClass}
                {...register('status')}
              >
                <option value="">No change</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>

            {/* Employment Type */}
            <div className={fieldClass}>
              <Label htmlFor="edit-employmentType">Employment Type</Label>
              <select
                id="edit-employmentType"
                className={selectClass}
                {...register('employmentType')}
              >
                <option value="">No change</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>

            {/* Designation */}
            <div className={fieldClass}>
              <Label htmlFor="edit-designation">Designation</Label>
              <Input
                id="edit-designation"
                placeholder="Software Engineer"
                {...register('designation')}
              />
            </div>

            {/* Phone */}
            <div className={fieldClass}>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+1 555 000 0000"
                {...register('phone')}
              />
            </div>

            {/* Department */}
            <div className={fieldClass}>
              <Label htmlFor="edit-departmentId">Department</Label>
              <select
                id="edit-departmentId"
                className={selectClass}
                {...register('departmentId')}
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Joining Date */}
            <div className={cn(fieldClass, 'sm:col-span-2')}>
              <Label htmlFor="edit-joiningDate">Joining Date</Label>
              <Input id="edit-joiningDate" type="date" {...register('joiningDate')} />
            </div>

            {/* Reporting Manager */}
            <div className={cn(fieldClass, 'sm:col-span-2')}>
              <Label htmlFor="edit-managerId">Reporting Manager</Label>
              <select
                id="edit-managerId"
                className={selectClass}
                {...register('managerId')}
              >
                <option value="">— Select manager —</option>
                {users
                  .filter((u) => u.id !== user?.id && (u.roleName === 'MANAGER' || u.roleName === 'HR_MANAGER' || u.roleName === 'DIRECTOR' || u.roleName === 'ADMIN' || u.roleName === 'HR'))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
