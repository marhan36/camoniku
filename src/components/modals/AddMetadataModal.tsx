import React, { useState } from 'react'
import { useMetadataStore } from '@/store/useMetadataStore'
import { normalizeString } from '@/utils/normalize'
import { X, Tag, FolderPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AddMetadataModalProps {
  isOpen: boolean
  type: 'classification' | 'category'
  notebookId: string
  onClose: () => void
  onSuccess?: (createdId: string) => void
}

export const AddMetadataModal: React.FC<AddMetadataModalProps> = ({
  isOpen,
  type,
  notebookId,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation()
  const { classifications, categories, addClassification, addCategory } = useMetadataStore()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const isClassification = type === 'classification'
  const title = isClassification ? t('modals.add_classification') : t('modals.add_category')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError(t('validation.required'))
      return
    }

    // Strict uniqueness check (ignoring case, whitespace, punctuation)
    const normalizedInput = normalizeString(trimmed)
    const existingList = isClassification
      ? classifications.filter((c) => c.notebook_id === notebookId)
      : categories.filter((c) => c.notebook_id === notebookId)

    const isDuplicate = existingList.some(
      (item) => normalizeString(item.name) === normalizedInput
    )

    if (isDuplicate) {
      setError(t('validation.name_unique'))
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      if (isClassification) {
        const result = await addClassification(notebookId, trimmed)
        if (result) {
          setName('')
          onSuccess?.(result.id)
          onClose()
        }
      } else {
        const result = await addCategory(notebookId, trimmed)
        if (result) {
          setName('')
          onSuccess?.(result.id)
          onClose()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              {isClassification ? <FolderPlus className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
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
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder={isClassification ? 'e.g., Household, Work' : 'e.g., Groceries, Dine Out'}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
            {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
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
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
