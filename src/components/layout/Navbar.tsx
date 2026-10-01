import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useNotebookStore } from '@/store/useNotebookStore'
import { NetworkStatusIndicator } from '@/components/common/NetworkStatusIndicator'
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  BookOpen,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Navbar: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { notebooks, activeNotebookId, setActiveNotebookId } = useNotebookStore()

  const navLinks = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/transactions', label: t('nav.transactions'), icon: Receipt },
    { to: '/reports', label: t('nav.reports'), icon: PieChart },
    { to: '/notebooks', label: t('nav.notebooks'), icon: BookOpen },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-900 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 bg-clip-text text-transparent">
                CamoniKu
              </span>
            </Link>

            {/* Active Notebook Selector Dropdown */}
            {notebooks.length > 0 && (
              <div className="relative inline-flex items-center ml-2">
                <select
                  value={activeNotebookId || ''}
                  onChange={(e) => setActiveNotebookId(e.target.value)}
                  className="appearance-none bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
                  title={t('nav.switch_notebook')}
                >
                  {notebooks.map((nb) => (
                    <option key={nb.id} value={nb.id}>
                      {nb.name} ({nb.currency})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right Header: Network status */}
          <div className="flex items-center gap-2.5 shrink-0">
            <NetworkStatusIndicator />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navLinks.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
