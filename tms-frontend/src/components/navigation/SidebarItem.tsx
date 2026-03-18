import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'

interface SidebarItemProps {
  icon: React.ElementType
  label: string
  path: string
  collapsed: boolean
  onClick?: () => void
}

export function SidebarItem({ icon: Icon, label, path, collapsed, onClick }: SidebarItemProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg text-sm font-medium',
      'transition-all duration-200 outline-none',
      'text-muted-foreground hover:text-foreground hover:bg-accent',
      isActive
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-400'
        : '',
      collapsed ? 'justify-center h-10 w-10 mx-auto p-0' : 'px-3 py-2.5 w-full',
    )

  const inner = (
    <NavLink
      to={path}
      end
      onClick={onClick}
      className={linkClass}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate leading-none">{label}</span>}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return inner
}
