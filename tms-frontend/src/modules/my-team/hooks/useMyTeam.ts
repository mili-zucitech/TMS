import { useState, useEffect, useCallback } from 'react'
import type { UserResponse } from '@/modules/users/types/user.types'
import myTeamService from '../services/myTeamService'
import userModuleService from '@/modules/users/services/userService'

/**
 * Fetching strategy per role:
 *  - ADMIN          : direct reports only (users whose managerId = userId)
 *  - MANAGER        : direct reports + all department colleagues (merged, deduplicated)
 *  - HR_MANAGER     : direct reports + all department colleagues (same as MANAGER)
 *  - DIRECTOR       : direct reports + all department colleagues (same as MANAGER)
 *  - HR / EMPLOYEE  : all users in the same department as the logged-in user
 */
export function useMyTeam(userId: string | null, role: string | null) {
  const [members, setMembers] = useState<UserResponse[]>([])
  const [directReportIds, setDirectReportIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<'team' | 'department' | 'both'>('team')

  const fetchTeam = useCallback(async () => {
    if (!userId || !role) return
    setIsLoading(true)
    setError(null)
    try {
      if (role === 'ADMIN') {
        setContext('team')
        setDirectReportIds(new Set())
        const data = await myTeamService.getTeamMembers(userId)
        setMembers(data)
      } else if (role === 'MANAGER' || role === 'HR_MANAGER' || role === 'DIRECTOR') {
        // Fetch direct reports + own profile (for departmentId) in parallel
        const [directReports, self] = await Promise.all([
          myTeamService.getTeamMembers(userId),
          userModuleService.getUserById(userId),
        ])
        const drSet = new Set(directReports.map((u) => u.id))
        setDirectReportIds(drSet)

        if (self.departmentId) {
          setContext('both')
          const deptMembers = await myTeamService.getDepartmentMembers(self.departmentId)
          // Merge: direct reports first, then remaining dept colleagues (excluding self)
          const deptOnly = deptMembers.filter((m) => m.id !== userId && !drSet.has(m.id))
          setMembers([...directReports, ...deptOnly])
        } else {
          setContext('team')
          setMembers(directReports)
        }
      } else {
        // HR and EMPLOYEE: fetch own profile first to get departmentId
        const self = await userModuleService.getUserById(userId)
        setDirectReportIds(new Set())
        if (!self.departmentId) {
          setMembers([])
          setContext('department')
          return
        }
        setContext('department')
        const data = await myTeamService.getDepartmentMembers(self.departmentId)
        setMembers(data.filter((m) => m.id !== userId))
      }
    } catch {
      setError('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }, [userId, role])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  return { members, directReportIds, isLoading, error, fetchTeam, context }
}
