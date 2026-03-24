import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Search, Bell, LogOut, Settings, User } from 'lucide-react'

import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu'
import { useAuth } from '@/context/AuthContext'
import { useUnreadCount, useNotifications } from '@/modules/notifications/hooks/useNotifications'
import { NotificationDropdown } from '@/modules/notifications/components/NotificationDropdown'
import { useGetUsersQuery } from '@/features/users/usersApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import { useGetProjectsQuery } from '@/features/projects/projectsApi'
import { useGetDepartmentsQuery } from '@/features/departments/departmentsApi'
import { useState, useRef, useEffect, useMemo } from 'react'

// ── Searchable nav items ─────────────────────────────────────

interface SearchItem {
  path: string
  label: string
  section: string
  roles?: string[]
}

const SEARCH_ITEMS: SearchItem[] = [
  { path: '/dashboard', label: 'Dashboard', section: 'Pages' },
  { path: '/tasks', label: 'Tasks', section: 'Work' },
  { path: '/timesheets', label: 'Timesheets', section: 'Work' },
  { path: '/timesheets/manager', label: 'Review Timesheets', section: 'Work', roles: ['ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'] },
  { path: '/timesheets/reminders', label: 'Send Reminders', section: 'Work', roles: ['ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'] },
  { path: '/projects', label: 'Projects', section: 'Work' },
  { path: '/users', label: 'Users', section: 'People', roles: ['ADMIN', 'HR', 'HR_MANAGER'] },
  { path: '/leave', label: 'Leave', section: 'People' },
  { path: '/leave/approvals', label: 'Leave Approvals', section: 'People', roles: ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'] },
  { path: '/holidays', label: 'Holidays', section: 'People' },
  { path: '/my-team', label: 'My Team', section: 'People' },
  { path: '/organization', label: 'Organization', section: 'People', roles: ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'] },
  { path: '/departments', label: 'Departments', section: 'People' },
  { path: '/reports', label: 'Reports', section: 'Insights', roles: ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR'] },
  { path: '/notifications', label: 'Notifications', section: 'System' },
  { path: '/settings', label: 'Settings', section: 'System', roles: ['ADMIN'] },
]

// ── Page title map ────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'User Management',
  '/organization': 'Organization',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/timesheets': 'Timesheets',
  '/leave': 'Leave Management',
  '/holidays': 'Holidays',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
}

// ── Component ─────────────────────────────────────────────────

interface AppHeaderProps {
  onMobileMenuClick: () => void
}

export function AppHeader({ onMobileMenuClick }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'TMS'
  const avatarLetter = user?.email?.charAt(0).toUpperCase() ?? 'U'
  const roleLabel = user?.roleName
    ? user.roleName.charAt(0) + user.roleName.slice(1).toLowerCase()
    : 'User'

  const userId = user?.userId ?? null
  const { count: unreadCount, refresh: refreshCount } = useUnreadCount(userId)
  const { notifications, markRead, markAllRead } = useNotifications(userId)
  const [notifOpen, setNotifOpen] = useState(false)

  // ── Search state ───────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const userRole = user?.roleName ?? null
  const skipSearch = query.trim().length < 2
  const canViewUsers = userRole !== null && ['ADMIN', 'HR', 'HR_MANAGER'].includes(userRole)

  const { data: usersData } = useGetUsersQuery(undefined, { skip: skipSearch || !canViewUsers })
  const { data: tasksData } = useGetTasksQuery(undefined, { skip: skipSearch })
  const { data: projectsData } = useGetProjectsQuery(undefined, { skip: skipSearch })
  const { data: deptsData } = useGetDepartmentsQuery(undefined, { skip: skipSearch })

  const searchResults = useMemo(() => {
    if (skipSearch) return { pages: [], users: [], tasks: [], projects: [], departments: [] }
    const q = query.trim().toLowerCase()

    const pages = SEARCH_ITEMS
      .filter(item => {
        const roleAllowed = !item.roles || (userRole !== null && item.roles.includes(userRole))
        return roleAllowed && (
          item.label.toLowerCase().includes(q) ||
          item.path.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q)
        )
      })
      .map(item => ({ path: item.path, label: item.label, sub: item.section, key: item.path }))

    const users = canViewUsers
      ? (usersData?.content ?? [])
          .filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.employeeId?.toLowerCase() ?? '').includes(q) ||
            (u.designation?.toLowerCase() ?? '').includes(q)
          )
          .slice(0, 5)
          .map(u => ({ path: '/users', label: u.name, sub: u.designation ?? u.roleName, key: `user-${u.id}` }))
      : []

    const tasks = (tasksData?.content ?? [])
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.taskCode?.toLowerCase() ?? '').includes(q) ||
        (t.description?.toLowerCase() ?? '').includes(q)
      )
      .slice(0, 5)
      .map(t => ({ path: '/tasks', label: t.title, sub: t.status, key: `task-${t.id}` }))

    const projects = (projectsData?.content ?? [])
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.projectCode?.toLowerCase() ?? '').includes(q) ||
        (p.clientName?.toLowerCase() ?? '').includes(q)
      )
      .slice(0, 5)
      .map(p => ({ path: '/projects', label: p.name, sub: p.status, key: `project-${p.id}` }))

    const departments = (deptsData?.content ?? [])
      .filter(d => d.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map(d => ({ path: '/departments', label: d.name, sub: `${d.memberCount ?? 0} members`, key: `dept-${d.id}` }))

    return { pages, users, tasks, projects, departments }
  }, [query, skipSearch, usersData, tasksData, projectsData, deptsData, userRole, canViewUsers])

  const allResults = [
    ...searchResults.pages,
    ...searchResults.users,
    ...searchResults.tasks,
    ...searchResults.projects,
    ...searchResults.departments,
  ]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      setQuery('')
    } else if (e.key === 'Enter' && allResults.length > 0) {
      navigate(allResults[0].path)
      setShowResults(false)
      setQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 sm:px-6">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9 shrink-0"
        onClick={onMobileMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Search */}
      <div ref={searchRef} className="hidden sm:flex relative items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowResults(true) }}
          onFocus={() => { if (query.trim()) setShowResults(true) }}
          onKeyDown={handleSearchKeyDown}
          className={cn(
            'h-9 w-52 rounded-lg border border-input bg-muted/50 pl-8 pr-3',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background',
            'transition-all duration-200',
          )}
          aria-label="Search"
          autoComplete="off"
          spellCheck={false}
        />
        {/* Results dropdown */}
        {showResults && query.trim().length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-border bg-white shadow-lg z-50 overflow-hidden max-h-[420px] overflow-y-auto">
            {allResults.length > 0 ? (
              <>
                {searchResults.pages.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">Pages</div>
                    {searchResults.pages.map(item => (
                      <button key={item.key} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left" onMouseDown={e => { e.preventDefault(); navigate(item.path); setShowResults(false); setQuery('') }}>
                        <span className="truncate font-medium flex-1">{item.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.users.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">People</div>
                    {searchResults.users.map(item => (
                      <button key={item.key} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left" onMouseDown={e => { e.preventDefault(); navigate(item.path); setShowResults(false); setQuery('') }}>
                        <span className="truncate font-medium flex-1">{item.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">Tasks</div>
                    {searchResults.tasks.map(item => (
                      <button key={item.key} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left" onMouseDown={e => { e.preventDefault(); navigate(item.path); setShowResults(false); setQuery('') }}>
                        <span className="truncate font-medium flex-1">{item.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">Projects</div>
                    {searchResults.projects.map(item => (
                      <button key={item.key} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left" onMouseDown={e => { e.preventDefault(); navigate(item.path); setShowResults(false); setQuery('') }}>
                        <span className="truncate font-medium flex-1">{item.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.departments.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">Departments</div>
                    {searchResults.departments.map(item => (
                      <button key={item.key} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left" onMouseDown={e => { e.preventDefault(); navigate(item.path); setShowResults(false); setQuery('') }}>
                        <span className="truncate font-medium flex-1">{item.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">Press Enter to open first result · Esc to close</div>
              </>
            ) : (
              <div className="px-3 py-2.5 text-sm text-muted-foreground">No results for &quot;{query}&quot;</div>
            )}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-0 border-0 shadow-none bg-transparent" sideOffset={8}>
          <NotificationDropdown
            notifications={notifications}
            onMarkRead={async (id) => { await markRead(id); void refreshCount() }}
            onMarkAllRead={async () => { await markAllRead(); void refreshCount() }}
            onClose={() => setNotifOpen(false)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full p-0 shrink-0 focus-visible:ring-offset-background"
            aria-label="User menu"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white select-none shadow-sm">
              {avatarLetter}
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {/* User info */}
          <DropdownMenuLabel>
            <div className="flex items-center gap-2.5 py-0.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                {avatarLetter}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate('/notifications')}>
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

// Also export a named Header alias for import flexibility
export { AppHeader as Header }
export { User }

