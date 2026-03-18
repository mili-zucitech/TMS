import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  approveLeave,
  applyLeave,
  cancelLeave,
  getLeaveBalance,
  getLeavesByUser,
  getLeaveTypes,
  getTeamLeavesByManager,
  initializeLeaveBalances,
  rejectLeave,
} from '../services/leaveService'
import type {
  LeaveApproveRequest,
  LeaveBalanceResponse,
  LeaveRejectRequest,
  LeaveRequestCreateRequest,
  LeaveRequestResponse,
  LeaveTypeResponse,
} from '../types/leave.types'

// ── My Leaves hook (employee view) ───────────────────────────

export function useMyLeaves(userId: string | null) {
  const [leaves, setLeaves] = useState<LeaveRequestResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaves = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getLeavesByUser(userId)
      setLeaves(data)
    } catch {
      setError('Failed to load leave requests')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchLeaves()
  }, [fetchLeaves])

  const submitLeave = useCallback(async (payload: LeaveRequestCreateRequest) => {
    const created = await applyLeave(payload)
    setLeaves((prev) => [created, ...prev])
    toast.success('Leave request submitted')
    return created
  }, [])

  const cancel = useCallback(async (id: number) => {
    const updated = await cancelLeave(id)
    setLeaves((prev) => prev.map((l) => (l.id === id ? updated : l)))
    toast.success('Leave request cancelled')
    return updated
  }, [])

  return { leaves, isLoading, error, fetchLeaves, submitLeave, cancel }
}

// ── Team Leaves hook (manager view) ─────────────────────────

export function useTeamLeaves(userId: string | null) {
  const [leaves, setLeaves] = useState<LeaveRequestResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaves = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTeamLeavesByManager(userId)
      setLeaves(data)
    } catch {
      setError('Failed to load team leave requests')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchLeaves()
  }, [fetchLeaves])

  const approve = useCallback(async (id: number, payload?: LeaveApproveRequest) => {
    const updated = await approveLeave(id, payload)
    setLeaves((prev) => prev.map((l) => (l.id === id ? updated : l)))
    toast.success('Leave request approved')
    return updated
  }, [])

  const reject = useCallback(async (id: number, payload: LeaveRejectRequest) => {
    const updated = await rejectLeave(id, payload)
    setLeaves((prev) => prev.map((l) => (l.id === id ? updated : l)))
    toast.success('Leave request rejected')
    return updated
  }, [])

  return { leaves, isLoading, error, fetchLeaves, approve, reject }
}

// ── Leave Balance hook ───────────────────────────────────────

export function useLeaveBalance(userId: string | null) {
  const [balances, setBalances] = useState<LeaveBalanceResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const fetchBalances = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await getLeaveBalance(userId)
      setBalances(data)
    } catch {
      /* silently ignore */
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchBalances()
  }, [fetchBalances])

  const initializeForYear = useCallback(
    async (year: number) => {
      setIsInitializing(true)
      try {
        const result = await initializeLeaveBalances(year)
        toast.success(`Initialized ${result.recordsCreated} balance record(s) for ${year}`)
        await fetchBalances()
        return result
      } catch {
        toast.error('Failed to initialize leave balances')
        throw new Error('initialization failed')
      } finally {
        setIsInitializing(false)
      }
    },
    [fetchBalances],
  )

  return { balances, isLoading, isInitializing, refetch: fetchBalances, initializeForYear }
}

// ── Leave Types hook ─────────────────────────────────────────

export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    getLeaveTypes()
      .then(setLeaveTypes)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return { leaveTypes, isLoading }
}
