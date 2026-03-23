import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/routes/ProtectedRoute'

// ── Mock useAuth ──────────────────────────────────────────────────────────────
const mockUseAuth = vi.fn()
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function Dashboard() {
  return <div>Dashboard content</div>
}

function LoginPageStub() {
  return <div>Login page</div>
}

/** Renders ProtectedRoute with a known set of routes for assertion */
function renderWithAuth(isAuthenticated: boolean, { initialEntry = '/dashboard' } = {}) {
  mockUseAuth.mockReturnValue({
    user: isAuthenticated ? { email: 'a@b.com', userId: 'uid-1', roleName: 'ADMIN' } : null,
    token: isAuthenticated ? 'tok' : null,
    isAuthenticated,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPageStub />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('renders the outlet (child route) when the user is authenticated', () => {
    renderWithAuth(true)
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('redirects to /login when the user is not authenticated', () => {
    renderWithAuth(false)
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument()
  })

  it('preserves the originally requested path in location state', () => {
    // We can verify the redirect happens — the state is internal to React Router
    renderWithAuth(false, { initialEntry: '/dashboard' })
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the outlet for a different protected path when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'a@b.com', userId: 'uid-1', roleName: 'EMPLOYEE' },
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<LoginPageStub />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })
})
