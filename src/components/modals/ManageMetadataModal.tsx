import React, { useState, useEffect } from 'react'
import { Notebook, Classification, Category } from '@/types'
import { useMetadataStore } from '@/store/useMetadataStore'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { normalizeString } from '@/utils/normalize'
import {
  X,
  Tags,
  FolderTree,
  Plus,
  Trash2,
  Tag,
  Loader2,
  FolderPlus,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface ManageMetadataModalProps {
  isOpen: boolean
  notebook: Notebook | null
  onClose: () => void
}

export const ManageMetadataModal: React.FC<ManageMetadataModalProps> = ({
  isOpen,
  notebook,
  onClose,
}) => {
  const { t } = useTranslation()
  const {
    classifications,
    categories,
    addClassification,
    addCategory,
    deleteClassification,
    deleteCategory,
    ensureNotebookMetadata,
  } = useMetadataStore()

  const [activeTab, setActiveTab] = useState<'classifications' | 'categories'>('classifications')
  const [newInputName, setNewInputName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{
    id: string
    name: string
    type: 'classification' | 'category'
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && notebook?.id) {
      ensureNotebookMetadata(notebook.id)
    }
  }, [isOpen, notebook?.id, ensureNotebookMetadata])

  if (!isOpen || !notebook) return null

  // Active items for this notebook
  const notebookClassifications = classifications.filter(
    (c) => c.notebook_id === notebook.id && c.is_active !== false
  )
  const notebookCategories = categories.filter(
    (c) => c.notebook_id === notebook.id && c.is_active !== false
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newInputName.trim()
    if (!trimmed) {
      toast.error(t('validation.required'))
      return
    }

    const normalized = normalizeString(trimmed)

    if (activeTab === 'classifications') {
      const isDuplicate = notebookClassifications.some(
        (c) => normalizeString(c.name) === normalized
      )
      if (isDuplicate) {
        toast.error(t('validation.name_unique'))
        return
      }

      setIsSubmitting(true)
      try {
        const res = await addClassification(notebook.id, trimmed)
        if (res) {
          setNewInputName('')
        }
      } finally {
        setIsSubmitting(false)
      }
    } else {
      const isDuplicate = notebookCategories.some(
        (c) => normalizeString(c.name) === normalized
      )
      if (isDuplicate) {
        toast.error(t('validation.name_unique'))
        return
      }

      setIsSubmitting(true)
      try {
        const res = await addCategory(notebook.id, trimmed)
        if (res) {
          setNewInputName('')
        }
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      if (itemToDelete.type === 'classification') {
        await deleteClassification(itemToDelete.id)
      } else {
        await deleteCategory(itemToDelete.id)
      }
    } finally {
      setIsDeleting(false)
      setItemToDelete(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Tags className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Classifications & Categories
                </h2>
                <p className="text-xs text-slate-500">{notebook.name}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="px-6 pt-4 shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('classifications')
                  setNewInputName('')
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'classifications'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>Classifications ({notebookClassifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('categories')
                  setNewInputName('')
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>Categories ({notebookCategories.length})</span>
              </button>
            </div>
          </div>

          {/* Add Input Form */}
          <div className="px-6 pt-4 pb-2 shrink-0">
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                placeholder={
                  activeTab === 'classifications'
                    ? 'New classification name...'
                    : 'New category name...'
                }
                value={newInputName}
                onChange={(e) => setNewInputName(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newInputName.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* List of active items */}
          <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-slate-100">
            {activeTab === 'classifications' ? (
              notebookClassifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No classifications yet. Add your first classification above.
                </p>
              ) : (
                notebookClassifications.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <FolderPlus className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {item.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setItemToDelete({
                          id: item.id,
                          name: item.name,
                          type: 'classification',
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete classification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )
            ) : notebookCategories.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No categories yet. Add your first category above.
              </p>
            ) : (
              notebookCategories.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {item.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setItemToDelete({
                        id: item.id,
                        name: item.name,
                        type: 'category',
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              Deleted items can be restored by adding them again with any capitalization.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Global Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title={`Delete ${itemToDelete?.type === 'classification' ? 'Classification' : 'Category'}`}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? Existing recorded transactions will retain their historical record.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  )
}
