import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'

// ── Mock useNavigate ──────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Mock useAuth ──────────────────────────────────────────────────────────────
const mockLogin = vi.fn()
vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/context/AuthContext')>()
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
    }),
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form', () => {
    renderLoginPage()
    expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument()
  })

  it('renders the "Welcome back" heading', () => {
    renderLoginPage()
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
  })

  it('renders the email and password fields', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
  })

  it('navigates to /dashboard on successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'admin@company.com',
        password: 'password123',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('shows an error message when login fails with a server message', async () => {
    const serverError = Object.assign(new Error('Unauthorized'), {
      response: {
        status: 401,
        data: { success: false, data: null, message: 'Invalid credentials' },
      },
    })
    mockLogin.mockRejectedValueOnce(serverError)

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'bad@user.com')
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows a fallback error when server response has no message', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Network Error'))

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid email or password. Please try again.',
      )
    })
  })

  it('clears the error message before each new submission', async () => {
    // First attempt fails
    mockLogin.mockRejectedValueOnce(new Error('First failure'))

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email address/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )

    // Second attempt succeeds
    mockLogin.mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })
})
