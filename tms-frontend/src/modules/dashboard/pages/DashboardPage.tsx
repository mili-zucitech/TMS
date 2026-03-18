import { useAuth } from '@/context/AuthContext'
import { EmployeeDashboardPage } from './EmployeeDashboardPage'
import { ManagerDashboardPage } from './ManagerDashboardPage'
import { HRDashboardPage } from './HRDashboardPage'

/**
 * Role-based dashboard router.
 * Renders the correct dashboard page based on the authenticated user's role.
 *
 *   EMPLOYEE → EmployeeDashboardPage
 *   MANAGER  → ManagerDashboardPage
 *   HR       → HRDashboardPage
 *   ADMIN    → HRDashboardPage (full visibility)
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const role = user?.roleName

  if (role === 'MANAGER') return <ManagerDashboardPage />
  if (role === 'HR' || role === 'ADMIN') return <HRDashboardPage />

  // Default — EMPLOYEE (and any unknown role)
  return <EmployeeDashboardPage />
}
