import React from 'react'
import { useNetworkStore } from '@/store/useNetworkStore'
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, syncStatus } = useNetworkStore()
  const { t } = useTranslation()

  if (!isOnline || syncStatus === 'offline') {
    return (
      <div
        title="Running locally offline. Changes will sync when reconnected."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100/80 text-amber-800 border border-amber-200"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>{t('sync.offline')}</span>
      </div>
    )
  }

  if (syncStatus === 'syncing') {
    return (
      <div
        title="Syncing changes with cloud..."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>{t('sync.syncing')}</span>
      </div>
    )
  }

  return (
    <div
      title="All changes synced"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      <span className="hidden sm:inline">{t('sync.synced')}</span>
    </div>
  )
}
