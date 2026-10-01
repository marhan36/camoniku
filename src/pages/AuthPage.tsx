import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Sparkles, ShieldCheck, Zap, Globe, ArrowRight, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const AuthPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loginWithGoogle, continueAsGuest } = useAuthStore()

  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true)
    try {
      const user = await loginWithGoogle()
      if (user) {
        navigate('/')
      }
    } finally {
      setIsLoadingGoogle(false)
    }
  }

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    continueAsGuest(guestName)
    setIsGuestModalOpen(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-200 mb-6">
          <Sparkles className="w-9 h-9" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          CamoniKu
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
          {t('auth.welcome_subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 space-y-4">
          {/* Feature Highlights */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Zap className="w-4 h-4" />
              </div>
              <span>{t('auth.feature_offline')}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Globe className="w-4 h-4" />
              </div>
              <span>{t('auth.feature_collab')}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>{t('auth.feature_sync')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Google Login */}
            <button
              type="button"
              disabled={isLoadingGoogle}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-2xl shadow-xs text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoadingGoogle ? t('common.connecting') : t('auth.login_with_google')}</span>
            </button>

            {/* Guest Login */}
            <button
              type="button"
              onClick={() => setIsGuestModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 transition cursor-pointer"
            >
              <span>{t('auth.continue_guest')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guest Nickname Modal */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t('auth.guest_modal_title')}</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t('auth.guest_modal_desc')}
            </p>

            <form onSubmit={handleGuestSubmit} className="mt-4 space-y-4">
              <div>
                <input
                  type="text"
                  autoFocus
                  placeholder={t('auth.nickname_placeholder')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('modals.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {t('auth.start_tracking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
