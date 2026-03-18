export const AUTH_ENDPOINTS = {
  login: '/auth/login',
} as const

export const USER_ENDPOINTS = {
  list: '/users',
  byId: (id: string) => `/users/${id}`,
} as const

export const HOLIDAY_ENDPOINTS = {
  list: '/holidays',
  byId: (id: number) => `/holidays/${id}`,
  range: '/holidays/range',
} as const

