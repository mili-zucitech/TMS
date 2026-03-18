import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm, type LoginFormValues } from '@/components/auth/LoginForm'
import { useAuth } from '@/context/AuthContext'
import type { ApiResponse } from '@/types/api.types'

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
      const axiosErr = err as AxiosError<ApiResponse<unknown>>
      const serverMessage = axiosErr.response?.data?.message
      setError(
        serverMessage ?? 'Invalid email or password. Please try again.',
      )
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

