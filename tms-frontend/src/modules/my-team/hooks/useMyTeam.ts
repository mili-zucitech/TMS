import { useMemo } from 'react'
import type { UserResponse } from '@/modules/users/types/user.types'
import {
  useGetUserByIdQuery,
  useGetUsersQuery,
} from '@/features/users/usersApi'
import {
  useGetTeamMembersQuery,
  useGetDepartmentMembersQuery,
} from '@/features/myteam/myTeamApi'

/**
 * Fetching strategy per role:
 *  - ADMIN          : direct reports only (users whose managerId = userId)
 *  - MANAGER        : direct reports + all department colleagues (merged, deduplicated)
 *  - HR_MANAGER     : direct reports + all department colleagues (same as MANAGER)
 *  - DIRECTOR       : direct reports + all department colleagues (same as MANAGER)
 *  - HR / EMPLOYEE  : all users in the same department as the logged-in user
 */
export function useMyTeam(userId: string | null, role: string | null) {
  const isManager = role === 'MANAGER' || role === 'HR_MANAGER' || role === 'DIRECTOR'
  const isAdmin = role === 'ADMIN'
  const isEmployee = !isAdmin && !isManager

  const { data: teamMembers = [], isLoading: isLoadingTeam } = useGetTeamMembersQuery(
    userId!,
    { skip: !userId || isEmployee },
  )

  const { data: selfProfile, isLoading: isLoadingSelf } = useGetUserByIdQuery(
    userId!,
    { skip: !userId || isAdmin },
  )

  const departmentId = selfProfile?.departmentId ?? null

  const { data: deptMembers = [], isLoading: isLoadingDept } = useGetDepartmentMembersQuery(
    departmentId!,
    { skip: departmentId === null || isAdmin },
  )

  const { refetch: fetchTeam } = useGetUsersQuery(undefined, { skip: !isAdmin })

  const { members, directReportIds, context } = useMemo<{
    members: UserResponse[]
    directReportIds: Set<string>
    context: 'team' | 'department' | 'both'
  }>(() => {
    if (!userId || !role) return { members: [], directReportIds: new Set(), context: 'team' }

    if (isAdmin) {
      // Admin: direct reports (users whose managerId = userId) from the user list
      const drSet = new Set(teamMembers.map((u) => u.id))
      return { members: teamMembers, directReportIds: drSet, context: 'team' }
    }

    if (isManager) {
      const drSet = new Set(teamMembers.map((u) => u.id))
      if (departmentId) {
        const deptOnly = deptMembers.filter((m) => m.id !== userId && !drSet.has(m.id))
        return {
          members: [...teamMembers, ...deptOnly],
          directReportIds: drSet,
          context: 'both',
        }
      }
      return { members: teamMembers, directReportIds: drSet, context: 'team' }
    }

    // HR / Employee: department colleagues (excluding self)
    return {
      members: deptMembers.filter((m) => m.id !== userId),
      directReportIds: new Set(),
      context: 'department',
    }
  }, [userId, role, isAdmin, isManager, teamMembers, deptMembers, departmentId])

  const isLoading = isLoadingTeam || isLoadingSelf || isLoadingDept

  return { members, directReportIds, isLoading, error: null, context, fetchTeam }
}
