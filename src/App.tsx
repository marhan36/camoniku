import React, { useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Skeleton } from '@/components/common/SkeletonLoader'

// Pages
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { NotebooksPage } from '@/pages/NotebooksPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ConfirmInvitePage } from '@/pages/ConfirmInvitePage'

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="space-y-4 max-w-xs w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-pulse mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public Route Guard (Redirects away from login if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (isLoading || !isInitialized) {
    return null
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export function App() {
  const { initAuth } = useAuthStore()
  const { initNotebooks } = useNotebookStore()
  const { initMetadata } = useMetadataStore()
  const { initTransactions } = useTransactionStore()

  useEffect(() => {
    initAuth()
    initNotebooks()
    initMetadata()
    initTransactions()
  }, [initAuth, initNotebooks, initMetadata, initTransactions])

  // Using HashRouter for seamless GitHub Pages routing without 404 rewrite server setup
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />

          {/* Invitation Confirmation Route */}
          <Route path="/invite/:inviteId" element={<ConfirmInvitePage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notebooks" element={<NotebooksPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
