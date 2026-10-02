import { create } from 'zustand'
import { NetworkSyncStatus } from '@/types'

interface NetworkState {
  isOnline: boolean
  syncStatus: NetworkSyncStatus
  manualSyncFn: (() => Promise<void>) | null
  setOnline: (online: boolean) => void
  setSyncStatus: (status: NetworkSyncStatus) => void
  setManualSyncFn: (fn: (() => Promise<void>) | null) => void
  syncNow: () => Promise<void>
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  manualSyncFn: null,

  setOnline: (isOnline) => set({ isOnline }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  setManualSyncFn: (manualSyncFn) => set({ manualSyncFn }),

  syncNow: async () => {
    const fn = get().manualSyncFn
    if (fn) {
      await fn()
    }
  },
}))
