import React from 'react'
import { useNetworkStore } from '@/store/useNetworkStore'
import { useAuthStore } from '@/store/useAuthStore'
import { WifiOff, RefreshCw, CheckCircle2, HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, syncStatus } = useNetworkStore()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  // 1. Guest / Offline mode: Data is strictly stored locally on this device
  if (user?.is_anonymous || syncStatus === 'local_only') {
    return (
      <div
        title={`${t('sync.local_only')} - ${t('sync.guest_mode_desc')}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 lg:px-2.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap shrink-0"
      >
        <HardDrive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="hidden lg:inline whitespace-nowrap">{t('sync.local_only')}</span>
      </div>
    )
  }

  // 2. Disconnected / Offline
  if (!isOnline || syncStatus === 'offline') {
    return (
      <div
        title={`${t('sync.offline')} - ${t('sync.offline_desc')}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 lg:px-2.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap shrink-0"
      >
        <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="hidden lg:inline whitespace-nowrap">{t('sync.offline')}</span>
      </div>
    )
  }

  // 3. Syncing with Firebase
  if (syncStatus === 'syncing') {
    return (
      <div
        title={`${t('sync.syncing')} - ${t('sync.syncing_desc')}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 lg:px-2.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs whitespace-nowrap shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
        <span className="hidden lg:inline whitespace-nowrap">{t('sync.syncing')}</span>
      </div>
    )
  }

  // 4. Authenticated & fully synced
  return (
    <div
      title={`${t('sync.synced')} - ${t('sync.synced_desc')}`}
      className="inline-flex items-center gap-1.5 px-2 py-1 lg:px-2.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap shrink-0"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="hidden lg:inline whitespace-nowrap">{t('sync.synced')}</span>
    </div>
  )
}
