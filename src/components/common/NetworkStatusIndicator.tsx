import React from 'react'
import { useNetworkStore } from '@/store/useNetworkStore'
import { useAuthStore } from '@/store/useAuthStore'
import { WifiOff, RefreshCw, CheckCircle2, HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, syncStatus, syncNow } = useNetworkStore()
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
      <button
        type="button"
        onClick={() => syncNow()}
        title={`${t('sync.offline')} • ${t('sync.click_to_sync')}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 lg:px-2.5 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95"
      >
        <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="hidden lg:inline whitespace-nowrap">{t('sync.offline')}</span>
      </button>
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

  // 4. Authenticated & fully synced (Clickable to force cloud sync)
  return (
    <button
      type="button"
      onClick={() => syncNow()}
      title={`${t('sync.synced')} • ${t('sync.click_to_sync')}`}
      className="inline-flex items-center gap-1.5 px-2 py-1 lg:px-2.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 group"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:hidden" />
      <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden group-hover:inline-block" />
      <span className="hidden lg:inline whitespace-nowrap">{t('sync.synced')}</span>
    </button>
  )
}
