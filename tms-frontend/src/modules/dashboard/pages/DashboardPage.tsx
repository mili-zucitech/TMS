import { lazy, Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { EmployeeDashboardPage } from './EmployeeDashboardPage'
import { ManagerDashboardPage } from './ManagerDashboardPage'
import { HRDashboardPage } from './HRDashboardPage'

/**
 * Role-based dashboard router.
 * Renders the correct dashboard page based on the authenticated user's role.
 *
 *   EMPLOYEE              → EmployeeDashboardPage
 *   MANAGER               → ManagerDashboardPage
 *   HR / ADMIN            → HRDashboardPage (full visibility)
 *   HR_MANAGER / DIRECTOR → HRDashboardPage (executive visibility)
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const role = user?.roleName

  if (role === 'MANAGER') return <ManagerDashboardPage />
  if (role === 'HR' || role === 'ADMIN' || role === 'HR_MANAGER' || role === 'DIRECTOR') {
    return <HRDashboardPage />
  }

  // Default — EMPLOYEE
  return <EmployeeDashboardPage />
}
