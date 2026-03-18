import { ThemeToggle } from '@/components/theme/theme-toggle'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Theme toggle - top right always visible */}
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen">
        {/* ── Left branding panel ───────────────────────────── */}
        <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%]">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-violet-700" />

          {/* Subtle mesh overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
            }}
          />

          {/* Decorative circles */}
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-teal-300/10 blur-2xl" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-start justify-between p-12 text-white">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-white"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">TMS</span>
            </div>

            {/* Hero text */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Enterprise Ready
                </div>
                <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                  Enterprise{' '}
                  <span className="text-emerald-300">Timesheet</span>
                  <br />
                  Management
                </h1>
                <p className="max-w-sm text-base leading-relaxed text-white/75">
                  Streamline employee time tracking, project management, and workforce analytics — all in one platform.
                </p>
              </div>

              {/* Feature bullets */}
              <ul className="space-y-3">
                {[
                  'Track hours across projects & tasks',
                  'Automated approval workflows',
                  'Real-time productivity insights',
                  'Leave & holiday management',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/30">
                      <svg
                        className="h-3 w-3 text-emerald-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom trust line */}
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} TMS · Enterprise Edition
            </p>
          </div>
        </div>

        {/* ── Right form panel ──────────────────────────────── */}
        <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 xl:w-[45%]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary-foreground"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">TMS</span>
          </div>

          {/* Form content */}
          <div className="w-full max-w-md animate-fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
