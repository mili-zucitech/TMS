import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { baseApi } from './baseApi'
import authReducer, { logout } from '@/features/auth/authSlice'

// ── Logout listener — clears all RTK Query cache entries on logout ─────────────
// Without this, cached API data (e.g. notifications with isRead state) persists
// in memory and is served to the next user or re-login within the keepUnusedDataFor
// window (default 60 s), causing stale "unread" state after re-login.
const authListener = createListenerMiddleware()
authListener.startListening({
  actionCreator: logout,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(baseApi.util.resetApiState())
  },
})

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(authListener.middleware)
      .concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

/** Creates a fresh store instance — useful for tests. */
export function createAppStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
    devTools: false,
  })
}
