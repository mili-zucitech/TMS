import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'

// LoginForm does not have router or auth context deps — render directly
describe('LoginForm', () => {
  it('renders the form with a heading', () => {
    render(<LoginForm />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders email, password field and submit button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation error when email is empty on submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows validation error when password is empty on submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('shows validation error for password shorter than 6 chars', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.type(screen.getByLabelText(/^password$/i), 'abc')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 6 characters'),
      ).toBeInTheDocument()
    })
  })

  it('calls onSubmit with correct values when form is valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/email address/i), 'admin@company.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@company.com',
          password: 'password123',
        }),
      )
    })
  })

  it('displays server error message when error prop is provided', () => {
    render(<LoginForm error="Invalid email or password. Please try again." />)
    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('Invalid email or password. Please try again.')
  })

  it('does not display error alert when error is null', () => {
    render(<LoginForm error={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows "Signing in…" when isLoading is true', () => {
    render(<LoginForm isLoading />)
    expect(screen.getByText('Signing in…')).toBeInTheDocument()
  })

  it('disables submit button when isLoading is true', () => {
    render(<LoginForm isLoading />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })

  it('toggles password visibility when show/hide button is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /hide password/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('has a remember-me checkbox', () => {
    render(<LoginForm />)
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument()
  })

  it('renders a "Forgot password?" link', () => {
    render(<LoginForm />)
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('does not call onSubmit when the form has validation errors', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    // submit without filling any fields
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(screen.getByText('Email is required')).toBeInTheDocument(),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
