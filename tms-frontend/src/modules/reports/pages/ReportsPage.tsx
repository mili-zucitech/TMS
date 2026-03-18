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

  // EMPLOYEE — limited view
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="h-7 w-7"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Personal reports are available in your timesheet history. Contact your manager
          or HR for team-level analytics.
        </p>
      </div>
    </div>
  )
}
