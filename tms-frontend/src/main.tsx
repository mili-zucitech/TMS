import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'sonner'

import { store } from '@/store/store'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { AuthProvider } from '@/context/AuthContext'
import App from './App'
import '@/assets/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider defaultTheme="light" storageKey="tms-ui-theme">
        <BrowserRouter>
          <AuthProvider store={store}>
            <App />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
)


