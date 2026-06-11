import { lazy, Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'

const HRReportsPage        = lazy(() => import('./HRReportsPage'))
const HRManagerReportsPage = lazy(() => import('./HRManagerReportsPage'))
const ManagerReportsPage   = lazy(() => import('./ManagerReportsPage'))
const DirectorReportsPage  = lazy(() => import('./DirectorReportsPage'))

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

/**
 * Role-based reports router.
 *
 * EMPLOYEE   → limited self-service message
 * MANAGER    → ManagerReportsPage (team-level)
 * HR         → HRReportsPage (operational)
 * HR_MANAGER → HRManagerReportsPage (operational + billable combined)
 * ADMIN      → HRReportsPage (full visibility)
 * DIRECTOR   → DirectorReportsPage (executive)
 */
export default function ReportsPage() {
  const { user } = useAuth()
  const role = user?.roleName

  if (role === 'DIRECTOR') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <DirectorReportsPage />
      </Suspense>
    )
  }

  if (role === 'HR_MANAGER') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <HRManagerReportsPage />
      </Suspense>
    )
  }

  if (role === 'HR' || role === 'ADMIN') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <HRReportsPage />
      </Suspense>
    )
  }

  if (role === 'MANAGER') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <ManagerReportsPage />
      </Suspense>
    )
  }

  // No reports access for EMPLOYEE or unknown roles
  return null
}
