import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm, type LoginFormValues } from '@/components/auth/LoginForm'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)

    try {
      await login({ email: values.email, password: values.password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // RTK Query errors: { status, data: { message } }
      // Axios errors (legacy): { response: { data: { message } } }
      const rtkMsg = (err as { data?: { message?: string } }).data?.message
      const axiosMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(rtkMsg ?? axiosMsg ?? 'Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleLogin}
        isLoading={isLoading}
        error={error}
      />
    </AuthLayout>
  )
}
