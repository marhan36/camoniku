import { create } from 'zustand'
import { NetworkSyncStatus } from '@/types'

interface NetworkState {
  isOnline: boolean
  syncStatus: NetworkSyncStatus
  setOnline: (online: boolean) => void
  setSyncStatus: (status: NetworkSyncStatus) => void
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',

  setOnline: (isOnline) =>
    set({
      isOnline,
      syncStatus: isOnline ? 'synced' : 'offline',
    }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),
}))
