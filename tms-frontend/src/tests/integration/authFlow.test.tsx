/**
 * Auth Flow Integration Test
 *
 * Tests the complete login flow end-to-end using MSW (real HTTP interception)
 * and the actual AuthContext + AuthProvider, LoginPage, LoginForm, and routing.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '@/context/AuthContext'
import LoginPage from '@/pages/auth/LoginPage'

// A minimal dashboard stub to confirm navigation
function DashboardStub() {
  return <main aria-label="dashboard">Dashboard</main>
}

/**
 * Render the full auth-capable app without mocking useAuth or useNavigate —
 * this is a true integration test.
 */
function renderApp(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardStub />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Auth flow integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the login form on the /login route', () => {
    renderApp('/login')
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
  })

  it('shows an error for invalid credentials (401 from server)', async () => {
    server.use(
      http.post('http://localhost:8080/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, data: null, message: 'Invalid credentials' },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText(/email address/i), 'wrong@user.com')
    await user.type(screen.getByLabelText(/^password$/i), 'badpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    })
  })

  it('navigates to /dashboard after a successful login', async () => {
    // The default MSW handler (admin@company.com / password123) returns a valid JWT
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('main', { name: /dashboard/i })).toBeInTheDocument()
    })
  })

  it('stores the access token in localStorage after successful login', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('main', { name: /dashboard/i })).toBeInTheDocument()
    })

    expect(localStorage.getItem('tms_token')).not.toBeNull()
  })

  it('does not store a token when login fails', async () => {
    server.use(
      http.post('http://localhost:8080/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, data: null, message: 'Bad credentials' },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText(/email address/i), 'bad@user.com')
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )

    expect(localStorage.getItem('tms_token')).toBeNull()
  })

  it('shows a loading indicator while the request is in flight', async () => {
    // Use a delayed handler so we can observe the loading state
    let resolveRequest!: () => void
    server.use(
      http.post('http://localhost:8080/api/v1/auth/login', async () => {
        await new Promise<void>((resolve) => {
          resolveRequest = resolve
        })
        const exp = Math.floor(Date.now() / 1000) + 3600
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        const payload = btoa(JSON.stringify({ sub: 'admin@company.com', userId: 'u1', roles: ['ROLE_ADMIN'], exp }))
        return HttpResponse.json({
          success: true,
          data: { accessToken: `${header}.${payload}.sig`, tokenType: 'Bearer' },
          message: 'OK',
        })
      }),
    )

    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Loading indicator should appear
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()

    // Resolve the pending request
    resolveRequest()

    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })
})
