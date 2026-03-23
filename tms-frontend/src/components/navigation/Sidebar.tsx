import { useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  ListChecks,
  Clock,
  ClipboardCheck,
  CalendarDays,
  CalendarCheck,
  BarChart2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  UsersRound,
} from 'lucide-react'

import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { SidebarItem } from './SidebarItem'

// ── Nav config ────────────────────────────────────────────────

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Work',
    items: [
      { path: '/tasks', label: 'Tasks', icon: ListChecks },
      { path: '/timesheets', label: 'Timesheets', icon: Clock },
      {
        path: '/timesheets/manager',
        label: 'Review Timesheets',
        icon: ClipboardCheck,
        roles: ['ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'],
      },
      {
        path: '/timesheets/reminders',
        label: 'Send Reminders',
        icon: Mail,
        roles: ['ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'],
      },
      {
        path: '/projects',
        label: 'Projects',
        icon: FolderKanban,
        roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
      },
    ],
  },
  {
    title: 'People',
    items: [
      { path: '/users', label: 'Users', icon: Users, roles: ['ADMIN', 'HR', 'HR_MANAGER'] },
      { path: '/leave', label: 'Leave', icon: CalendarDays },
      {
        path: '/leave/approvals',
        label: 'Leave Approvals',
        icon: ClipboardCheck,
        roles: ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'],
      },
      { path: '/holidays', label: 'Holidays', icon: CalendarCheck },
      { path: '/my-team', label: 'My Team', icon: UsersRound },
      {
        path: '/organization',
        label: 'Organization',
        icon: Building2,
        roles: ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'],
      },
      {
        path: '/departments',
        label: 'Departments',
        icon: Building2,
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        path: '/reports',
        label: 'Reports',
        icon: BarChart2,
        roles: ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'],
      },
    ],
  },
  {
    title: 'System',
    items: [
      { path: '/notifications', label: 'Notifications', icon: Bell },
      { path: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
]

// ── TMS brand icon (calendar mark) ───────────────────────────

function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  )
}

// ── SidebarContent ────────────────────────────────────────────

interface SidebarContentProps {
  isCollapsed: boolean
  userRole: string | null
  onToggleCollapsed?: () => void
  onClose?: () => void
  onItemClick?: () => void
}

function SidebarContent({
  isCollapsed,
  userRole,
  onToggleCollapsed,
  onClose,
  onItemClick,
}: SidebarContentProps) {
  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* ── Brand header ──────────────────────────────── */}
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-border transition-all duration-300',
            isCollapsed ? 'flex-col gap-1.5 px-2.5 py-3' : 'h-16 justify-between px-4',
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <BrandIcon className="h-4 w-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="block text-[15px] font-bold tracking-tight leading-none">
                  TMS
                </span>
                <span className="block text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-0.5">
                  Timesheet Manager
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle (shown when expanded) */}
          {!isCollapsed && onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Collapsed expand button (at top when collapsed) */}
          {isCollapsed && onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Mobile close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* ── Navigation ────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-3">
          <div className={cn('space-y-0.5', isCollapsed ? 'px-2' : 'px-3')}>
            {NAV_SECTIONS.map((section, idx) => {
              const visibleItems = section.items.filter((item) => {
                if (!item.roles) return true
                if (!userRole) return false
                return item.roles.includes(userRole)
              })

              if (visibleItems.length === 0) return null

              return (
                <div key={idx} className={cn(idx > 0 && 'mt-4')}>
                  {/* Section label (only when expanded) */}
                  {section.title && !isCollapsed && (
                    <h4 className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {section.title}
                    </h4>
                  )}
                  {/* Divider between sections when collapsed */}
                  {section.title && isCollapsed && idx > 0 && (
                    <div className="mx-auto mb-3 h-px w-6 bg-border" />
                  )}

                  <div
                    className={cn(
                      'space-y-0.5',
                      isCollapsed && 'flex flex-col items-center',
                    )}
                  >
                    {visibleItems.map((item) => (
                      <SidebarItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        collapsed={isCollapsed}
                        onClick={onItemClick}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        {/* ── Footer ────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 border-t border-border',
            isCollapsed ? 'p-2' : 'px-3 py-2',
          )}
        >
          {isCollapsed ? (
            <p className="text-center text-[10px] text-muted-foreground/40 select-none py-1">
              v1
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground/40 select-none px-3 py-1">
              TMS v1.0 · Enterprise Edition
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// ── Sidebar (export) ──────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  userRole: string | null
  onToggleCollapsed: () => void
  onCloseMobile: () => void
}

export function Sidebar({
  collapsed,
  mobileOpen,
  userRole,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) onCloseMobile()
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [onCloseMobile])

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-screen',
          'hidden md:flex flex-col',
          'bg-card border-r border-border',
          'transition-all duration-300 ease-in-out overflow-hidden',
        )}
        style={{ width: collapsed ? 80 : 260 }}
      >
        <SidebarContent
          isCollapsed={collapsed}
          userRole={userRole}
          onToggleCollapsed={onToggleCollapsed}
        />
      </aside>

      {/* ── Mobile overlay drawer ─────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 w-[280px] bg-card border-r border-border shadow-2xl overflow-hidden animate-in slide-in-from-left duration-300">
            <SidebarContent
              isCollapsed={false}
              userRole={userRole}
              onClose={onCloseMobile}
              onItemClick={onCloseMobile}
            />
          </div>
        </div>
      )}
    </>
  )
}

