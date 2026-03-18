import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/navigation/Sidebar'
import { AppHeader } from '@/components/navigation/Navbar'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

// ── Responsive breakpoint hook ────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Layout ────────────────────────────────────────────────────

export function AppLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const isMobile = useIsMobile()

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
