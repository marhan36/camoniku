import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Toaster } from 'sonner'
import { useSync } from '@/hooks/useSync'

export const AppLayout: React.FC = () => {
  // Activate real-time sync and network listener
  useSync()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 md:pb-8">
      {/* Toast notifications */}
      <Toaster position="top-right" richColors closeButton expand={true} visibleToasts={5} />

      {/* Navigation */}
      <Navbar />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
