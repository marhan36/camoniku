import React, { useState, useEffect } from 'react'
import { Notebook } from '@/types'
import { useNotebookStore } from '@/store/useNotebookStore'
import { SUPPORTED_CURRENCIES } from '@/utils/currency'
import { X, BookOpen, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface NotebookModalProps {
  isOpen: boolean
  notebookToEdit?: Notebook | null
  onClose: () => void
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  isOpen,
  notebookToEdit,
  onClose,
}) => {
  const { t } = useTranslation()
  const { createNotebook, updateNotebook, setActiveNotebookId } = useNotebookStore()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('IDR')
  const [setAsActive, setSetAsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (notebookToEdit) {
        setName(notebookToEdit.name)
        setCurrency(notebookToEdit.currency)
        setSetAsActive(false)
      } else {
        setName('')
        setCurrency('IDR')
        setSetAsActive(true)
      }
      setError(null)
    }
  }, [isOpen, notebookToEdit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('validation.required'))
      return
    }

    setIsSubmitting(true)
    try {
      if (notebookToEdit) {
        await updateNotebook(notebookToEdit.id, {
          name: trimmed,
          currency,
        })
        if (setAsActive) {
          setActiveNotebookId(notebookToEdit.id)
        }
      } else {
        const created = await createNotebook(trimmed, currency)
        if (setAsActive && created) {
          setActiveNotebookId(created.id)
        }
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {notebookToEdit ? 'Edit Notebook' : t('notebooks.create_notebook')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('notebooks.name')} *
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g., Personal Finances, Family Home"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
            {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('notebooks.currency')}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="set_active"
              type="checkbox"
              checked={setAsActive}
              onChange={(e) => setSetAsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="set_active" className="text-sm text-slate-700 select-none">
              Set as active notebook for dashboard
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              {t('modals.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {notebookToEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
