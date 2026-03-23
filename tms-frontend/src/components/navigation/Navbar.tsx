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
import { useState } from 'react'

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
      <div className="hidden sm:flex relative items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        {/* TODO: wire up search — needs a state handler, debounce, and a results popover */}
        <input
          type="search"
          placeholder="Search…"
          className={cn(
            'h-9 w-52 rounded-lg border border-input bg-muted/50 pl-8 pr-3',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background',
            'transition-all duration-200',
          )}
          aria-label="Search"
        />
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

