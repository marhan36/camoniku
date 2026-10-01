import React from 'react'
import { Link } from 'react-router-dom'
import { Home, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
        <HelpCircle className="w-9 h-9" />
      </div>
      <h1 className="text-4xl font-black text-slate-900 tracking-tight">404</h1>
      <h2 className="text-lg font-bold text-slate-700 mt-2">{t('not_found.title')}</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">
        {t('not_found.desc')}
      </p>

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition"
      >
        <Home className="w-4 h-4" />
        <span>{t('not_found.return_to_dashboard')}</span>
      </Link>
    </div>
  )
}
