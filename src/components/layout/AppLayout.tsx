import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { TransactionModal } from '@/components/modals/TransactionModal'
import { Toaster } from 'sonner'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSync } from '@/hooks/useSync'

export const AppLayout: React.FC = () => {
  const { t } = useTranslation()
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)

  // Activate real-time sync and network listener
  useSync()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 md:pb-8">
      {/* Toast notifications */}
      <Toaster position="top-right" richColors closeButton />

      {/* Navigation */}
      <Navbar onOpenAddTransaction={() => setIsAddTxOpen(true)} />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Floating Action Button (FAB) for Mobile & Quick Desktop access */}
      <button
        type="button"
        onClick={() => setIsAddTxOpen(true)}
        aria-label={t('dashboard.add_transaction')}
        className="fixed right-5 bottom-20 md:bottom-8 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
      />
    </div>
  )
}
