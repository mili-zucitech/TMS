import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/navigation/Sidebar'
import { AppHeader } from '@/components/navigation/Navbar'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// ── Static route-to-title map ─────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-team': 'My Team',
  '/users': 'User Management',
  '/organization': 'Organization',
  '/departments': 'Departments',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/timesheets': 'Timesheets',
  '/timesheets/history': 'Timesheet History',
  '/timesheets/manager': 'Team Timesheets',
  '/timesheets/reminders': 'Timesheet Reminders',
  '/leave': 'Leave Management',
  '/leave/approvals': 'Leave Approvals',
  '/holidays': 'Holidays',
  '/notifications': 'Notifications',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

/** Resolve title for the current path, handling dynamic segments like /projects/:id */
function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Match /timesheets/<uuid> → "Timesheet"
  if (/^\/timesheets\/[^/]+$/.test(pathname)) return 'Timesheet'
  if (/^\/timesheets\/manager\/review\/[^/]+$/.test(pathname)) return 'Review Timesheet'
  if (/^\/projects\/[^/]+$/.test(pathname)) return 'Project Details'
  if (/^\/tasks\/[^/]+$/.test(pathname)) return 'Task Details'
  return 'TMS'
}

// ── Layout ────────────────────────────────────────────────────

export function AppLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const isMobile = useIsMobile()

  useDocumentTitle(resolvePageTitle(location.pathname))

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  const handleOpenMobile = useCallback(() => {
    setMobileOpen(true)
  }, [])

  // Margin for main content: 0 on mobile (sidebar is overlay), dynamic on desktop
  const marginLeft = isMobile ? 0 : collapsed ? 80 : 255

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        userRole={user?.roleName ?? null}
        onToggleCollapsed={handleToggleCollapsed}
        onCloseMobile={handleCloseMobile}
      />

      {/* Main content area */}
      <div
        className={cn('flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out')}
        style={{ marginLeft }}
      >
        {/* Sticky header */}
        <AppHeader onMobileMenuClick={handleOpenMobile} />

        {/* Scrollable page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
