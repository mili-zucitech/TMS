import React from 'react'
import { Provider } from 'react-redux'
import { createAppStore } from '@/store/store'

/**
 * Creates a React wrapper component that provides a fresh Redux store.
 * Use as the `wrapper` option in renderHook or as a wrapper in render.
 *
 * @example
 * const { result } = renderHook(() => useMyHook(), {
 *   wrapper: createReduxWrapper(),
 * })
 */
export function createReduxWrapper(initialLocalStorage?: Record<string, string>) {
  if (initialLocalStorage) {
    Object.entries(initialLocalStorage).forEach(([k, v]) => localStorage.setItem(k, v))
  }
  const testStore = createAppStore()

  function ReduxWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={testStore}>{children}</Provider>
  }

  return { wrapper: ReduxWrapper, store: testStore }
}
