import { create } from 'zustand'
import { Transaction } from '@/types'
import { localDB } from '@/lib/storage/localStorage'
import { db } from '@/lib/firebase/config'
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useAuthStore } from './useAuthStore'
import { toast } from 'sonner'
import i18n from '@/i18n'

interface TransactionState {
  transactions: Transaction[]
  isLoading: boolean
  setTransactions: (transactions: Transaction[]) => void
  addTransaction: (
    data: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ) => Promise<Transaction>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  initTransactions: () => void
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: localDB.getTransactions(),
  isLoading: false,

  setTransactions: (transactions) => {
    localDB.setTransactions(transactions)
    set({ transactions })
  },

  addTransaction: async (data) => {
    const user = useAuthStore.getState().user
    const userId = user?.id || 'guest'
    const userName = user?.name || (user?.is_anonymous ? 'Guest' : 'User')
    const now = new Date().toISOString()

    const newTx: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      user_name: userName,
      created_at: now,
      updated_at: now,
    }

    const updated = [newTx, ...get().transactions]
    localDB.setTransactions(updated)
    set({ transactions: updated })

    if (user && !user.is_anonymous) {
      try {
        await setDoc(doc(db, 'transactions', newTx.id), newTx)
      } catch (e) {
        console.warn('Error saving transaction to Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.transaction_created'))
    return newTx
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    const now = new Date().toISOString()
    const updated = get().transactions.map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: now } : t
    )

    localDB.setTransactions(updated)
    set({ transactions: updated })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'transactions', id), { ...updates, updated_at: now })
      } catch (e) {
        console.warn('Error updating transaction in Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.transaction_updated'))
  },

  deleteTransaction: async (id: string) => {
    const updated = get().transactions.filter((t) => t.id !== id)
    localDB.setTransactions(updated)
    set({ transactions: updated })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await deleteDoc(doc(db, 'transactions', id))
      } catch (e) {
        console.warn('Error deleting transaction from Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.transaction_deleted'))
  },

  initTransactions: () => {
    set({ transactions: localDB.getTransactions() })
  },
}))
