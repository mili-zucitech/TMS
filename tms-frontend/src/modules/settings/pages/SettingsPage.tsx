import { useState } from 'react'
import { User, Palette, Bell, ShieldCheck, Info } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { ProfileSection }       from '../components/ProfileSection'
import { AppearanceSection }    from '../components/AppearanceSection'
import { NotificationsSection } from '../components/NotificationsSection'
import { SecuritySection }      from '../components/SecuritySection'
import { AboutSection }         from '../components/AboutSection'

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security' | 'about'

interface NavItem {
  id: SettingsTab
  label: string
  icon: React.ElementType
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile',       label: 'Profile',        icon: User },
  { id: 'appearance',    label: 'Appearance',      icon: Palette },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'security',      label: 'Security',        icon: ShieldCheck },
  { id: 'about',         label: 'About',           icon: Info },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || (user?.roleName && item.roles.includes(user.roleName)),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-1 px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, appearance, and account preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Sidebar nav */}
        <nav className="md:w-52 shrink-0">
          <ul className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-sm">
            {visibleNav.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile'       && <ProfileSection />}
          {activeTab === 'appearance'    && <AppearanceSection />}
          {activeTab === 'notifications' && <NotificationsSection />}
          {activeTab === 'security'      && <SecuritySection />}
          {activeTab === 'about'         && <AboutSection />}
        </div>
      </div>
    </div>
  )
}
