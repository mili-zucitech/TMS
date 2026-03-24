import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  useGetLeaveTypesQuery,
  useGetLeavesByUserQuery,
  useGetTeamLeavesByManagerQuery,
  useApplyLeaveMutation,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useCancelLeaveMutation,
  useGetLeaveBalanceQuery,
  useInitializeLeaveBalancesMutation,
} from '@/features/leave/leaveApi'
import type {
  LeaveApproveRequest,
  LeaveRejectRequest,
  LeaveRequestCreateRequest,
} from '../types/leave.types'

// ── My Leaves hook (employee view) ────────────────────────────────────────────

export function useMyLeaves(userId: string | null) {
  const {
    data: leaves = [],
    isLoading,
    error: queryError,
    refetch: fetchLeaves,
  } = useGetLeavesByUserQuery(userId!, { skip: !userId })
  const error = queryError ? 'Failed to load leave requests' : null

  const [applyLeaveMutation] = useApplyLeaveMutation()
  const [cancelLeaveMutation] = useCancelLeaveMutation()

  const submitLeave = useCallback(
    async (payload: LeaveRequestCreateRequest) => {
      const created = await applyLeaveMutation(payload).unwrap()
      toast.success('Leave request submitted')
      return created
    },
    [applyLeaveMutation],
  )

  const cancel = useCallback(
    async (id: number) => {
      if (!userId) throw new Error('userId required')
      const updated = await cancelLeaveMutation({ id, userId }).unwrap()
      toast.success('Leave request cancelled')
      return updated
    },
    [cancelLeaveMutation, userId],
  )

  return { leaves, isLoading, error, fetchLeaves, submitLeave, cancel }
}

// ── Team Leaves hook (manager view) ──────────────────────────────────────────

export function useTeamLeaves(userId: string | null) {
  const {
    data: leaves = [],
    isLoading,
    error: queryError,
    refetch: fetchLeaves,
  } = useGetTeamLeavesByManagerQuery(userId!, { skip: !userId })
  const error = queryError ? 'Failed to load team leave requests' : null

  const [approveLeaveMutation] = useApproveLeaveMutation()
  const [rejectLeaveMutation] = useRejectLeaveMutation()

  const approve = useCallback(
    async (id: number, payload?: LeaveApproveRequest) => {
      if (!userId) throw new Error('userId required')
      const updated = await approveLeaveMutation({ id, body: payload, managerId: userId }).unwrap()
      toast.success('Leave request approved')
      return updated
    },
    [approveLeaveMutation, userId],
  )

  const reject = useCallback(
    async (id: number, payload: LeaveRejectRequest) => {
      if (!userId) throw new Error('userId required')
      const updated = await rejectLeaveMutation({ id, body: payload, managerId: userId }).unwrap()
      toast.success('Leave request rejected')
      return updated
    },
    [rejectLeaveMutation, userId],
  )

  return { leaves, isLoading, error, fetchLeaves, approve, reject }
}

// ── Leave Balance hook ────────────────────────────────────────────────────────

export function useLeaveBalance(userId: string | null) {
  const {
    data: balances = [],
    isLoading,
    refetch: fetchBalances,
  } = useGetLeaveBalanceQuery(userId!, { skip: !userId })

  const [initializeLeaveBalancesMutation, { isLoading: isInitializing }] =
    useInitializeLeaveBalancesMutation()

  const initializeForYear = useCallback(
    async (year: number) => {
      try {
        const result = await initializeLeaveBalancesMutation(year).unwrap()
        toast.success(`Initialized ${result.recordsCreated} balance record(s) for ${year}`)
        return result
      } catch {
        toast.error('Failed to initialize leave balances')
        throw new Error('initialization failed')
      }
    },
    [initializeLeaveBalancesMutation],
  )

  return { balances, isLoading, isInitializing, refetch: fetchBalances, initializeForYear }
}

// ── Leave Types hook ──────────────────────────────────────────────────────────

export function useLeaveTypes() {
  const { data: leaveTypes = [], isLoading } = useGetLeaveTypesQuery()
  return { leaveTypes, isLoading }
}
