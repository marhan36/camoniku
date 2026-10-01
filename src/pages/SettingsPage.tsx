import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { SUPPORTED_DATE_FORMATS } from '@/utils/date'
import { ImportJsonModal } from '@/components/modals/ImportJsonModal'
import {
  User,
  Globe,
  Calendar,
  Download,
  Upload,
  LogOut,
  Sparkles,
  Save,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { NotebookExportData } from '@/types'

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, updateProfileName, logout, loginWithGoogle } = useAuthStore()
  const { language, setLanguage, dateFormat, setDateFormat } = useSettingsStore()
  const { notebooks, activeNotebookId, getActiveNotebook } = useNotebookStore()
  const { classifications, categories } = useMetadataStore()
  const { transactions } = useTransactionStore()

  const [displayName, setDisplayName] = useState(user?.name || '')
  const [selectedExportNotebookId, setSelectedExportNotebookId] = useState(
    activeNotebookId || notebooks[0]?.id || ''
  )
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)

  const activeNotebook = getActiveNotebook()

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    await updateProfileName(displayName)
  }

  const handleExportJson = () => {
    const targetNotebook = notebooks.find((n) => n.id === selectedExportNotebookId)
    if (!targetNotebook) {
      toast.error(t('settings.select_valid_notebook', 'Please select a valid notebook to export.'))
      return
    }

    const nbClass = classifications.filter((c) => c.notebook_id === targetNotebook.id)
    const nbCat = categories.filter((c) => c.notebook_id === targetNotebook.id)
    const nbTx = transactions.filter((t) => t.notebook_id === targetNotebook.id)

    const exportPayload: NotebookExportData = {
      notebook: targetNotebook,
      classifications: nbClass,
      categories: nbCat,
      transactions: nbTx,
      export_version: '1.0.0',
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `camoniku-${targetNotebook.name.toLowerCase().replace(/\s+/g, '-')}-backup.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(t('settings.export_success'))
  }

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true)
    try {
      const loggedUser = await loginWithGoogle()
      if (loggedUser) {
        toast.success(t('settings.link_google_success'))
      }
    } finally {
      setIsLinkingGoogle(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Cloud Sync & Account Banner (if Guest) */}
      {user?.is_anonymous && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('settings.offline_guest_badge')}</span>
            </div>
            <h3 className="text-lg font-bold">{t('settings.sync_banner_title')}</h3>
            <p className="text-xs text-amber-100 max-w-md">
              {t('settings.guest_migration_notice')}
            </p>
          </div>

          <button
            type="button"
            disabled={isLinkingGoogle}
            onClick={handleLinkGoogle}
            className="px-5 py-2.5 bg-white text-slate-900 hover:bg-amber-50 font-bold text-xs rounded-xl shadow-md transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            {isLinkingGoogle ? t('common.connecting') : t('settings.sync_with_google')}
          </button>
        </div>
      )}

      {/* Section 1: Profile */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('settings.profile')}</h2>
            <p className="text-xs text-slate-400">{t('settings.profile_desc')}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('settings.name')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {user?.email && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('settings.email')}
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t('settings.save_profile')}</span>
          </button>
        </form>
      </div>

      {/* Section 2: Preferences */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('settings.preferences')}</h2>
            <p className="text-xs text-slate-400">{t('settings.preferences_desc')}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {/* Language Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('settings.language')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  language === 'en'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🇬🇧 English (EN)</span>
                {language === 'en' && <CheckCircle className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  language === 'id'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🇮🇩 Indonesia (ID)</span>
                {language === 'id' && <CheckCircle className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Date Format Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('settings.date_format')}
            </label>
            <div className="relative">
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {SUPPORTED_DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Data Management (JSON Backup & Import) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('settings.data_management')}</h2>
            <p className="text-xs text-slate-400">{t('settings.backup_desc')}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4 max-w-xl">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">{t('settings.export_backup_title')}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('settings.export_backup_desc')}
              </p>
              {notebooks.length > 0 && (
                <select
                  value={selectedExportNotebookId}
                  onChange={(e) => setSelectedExportNotebookId(e.target.value)}
                  className="mt-2 text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                >
                  {notebooks.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.currency})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{t('settings.export_json')}</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">{t('settings.import_backup_title')}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('settings.import_backup_desc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>{t('settings.import_json')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Logout */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t('settings.sign_out_title')}</h3>
          <p className="text-xs text-slate-400">{t('settings.sign_out_desc')}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>

      {/* Import Modal */}
      <ImportJsonModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
