import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { isTokenExpired } from '@/utils/token'
import { config } from '@/config/env'

const axiosClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

function redirectToLogin() {
  localStorage.removeItem('tms_token')
  localStorage.removeItem('tms_user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// ── Request interceptor: attach JWT ────────────────────────────────────
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('tms_token')
    if (token) {
      if (isTokenExpired(token)) {
        redirectToLogin()
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor: handle 401 globally ──────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

export default axiosClient

