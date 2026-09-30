import React, { useState } from 'react'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useAuthStore } from '@/store/useAuthStore'
import { validateNotebookImport } from '@/utils/export'
import { localDB } from '@/lib/storage/localStorage'
import { db } from '@/lib/firebase/config'
import { doc, setDoc } from 'firebase/firestore'
import { X, UploadCloud, FileJson, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { NotebookExportData } from '@/types'

interface ImportJsonModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ImportJsonModal: React.FC<ImportJsonModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { notebooks, setNotebooks, setActiveNotebookId } = useNotebookStore()
  const { classifications, categories, setClassifications, setCategories } = useMetadataStore()
  const { transactions, setTransactions } = useTransactionStore()
  const { user } = useAuthStore()

  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<NotebookExportData | null>(null)
  const [targetMode, setTargetMode] = useState<'create_new' | 'existing'>('create_new')
  const [selectedNotebookId, setSelectedNotebookId] = useState(notebooks[0]?.id || '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    setValidationError(null)
    setParsedData(null)

    if (!selected) {
      setFile(null)
      return
    }

    if (!selected.name.endsWith('.json')) {
      setValidationError('Please select a valid .json file.')
      setFile(null)
      return
    }

    setFile(selected)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string)
        const validated = validateNotebookImport(rawJson)
        setParsedData(validated)
      } catch (err: unknown) {
        console.error('Validation error:', err)
        setValidationError(
          'Invalid file format. The file is not a valid CamoniKu notebook backup.'
        )
      }
    }
    reader.readAsText(selected)
  }

  const handleExecuteImport = async () => {
    if (!parsedData) return
    setIsImporting(true)

    try {
      const userId = user?.id || 'guest'
      const now = new Date().toISOString()

      let targetId = selectedNotebookId

      if (targetMode === 'create_new') {
        targetId = crypto.randomUUID()
        const newNotebook = {
          ...parsedData.notebook,
          id: targetId,
          name: `${parsedData.notebook.name} (Imported)`,
          owner_id: userId,
          member_ids: [userId],
          created_at: now,
          updated_at: now,
        }

        const updatedNotebooks = [...notebooks, newNotebook]
        setNotebooks(updatedNotebooks)
        setActiveNotebookId(targetId)

        if (user && !user.is_anonymous) {
          await setDoc(doc(db, 'notebooks', targetId), newNotebook)
        }
      }

      // Map imported classifications & categories to target notebook
      const newClassifications = parsedData.classifications.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
        notebook_id: targetId,
      }))

      const newCategories = parsedData.categories.map((cat) => ({
        ...cat,
        id: crypto.randomUUID(),
        notebook_id: targetId,
      }))

      // Create lookup maps to remap transaction foreign keys
      const oldToNewClassMap = new Map(
        parsedData.classifications.map((c, i) => [c.id, newClassifications[i].id])
      )
      const oldToNewCatMap = new Map(
        parsedData.categories.map((cat, i) => [cat.id, newCategories[i].id])
      )

      const newTransactions = parsedData.transactions.map((t) => ({
        ...t,
        id: crypto.randomUUID(),
        notebook_id: targetId,
        user_id: userId,
        classification_id: oldToNewClassMap.get(t.classification_id) || newClassifications[0]?.id || '',
        category_id: oldToNewCatMap.get(t.category_id) || newCategories[0]?.id || '',
      }))

      // Update local storage and stores
      const combinedClass = [...classifications, ...newClassifications]
      const combinedCat = [...categories, ...newCategories]
      const combinedTx = [...newTransactions, ...transactions]

      setClassifications(combinedClass)
      setCategories(combinedCat)
      setTransactions(combinedTx)

      localDB.setClassifications(combinedClass)
      localDB.setCategories(combinedCat)
      localDB.setTransactions(combinedTx)

      // Sync to firestore if authenticated
      if (user && !user.is_anonymous) {
        for (const c of newClassifications) {
          await setDoc(doc(db, 'classifications', c.id), c)
        }
        for (const cat of newCategories) {
          await setDoc(doc(db, 'categories', cat.id), cat)
        }
        for (const t of newTransactions) {
          await setDoc(doc(db, 'transactions', t.id), t)
        }
      }

      toast.success(t('toasts.data_imported'))
      onClose()
    } catch (e: unknown) {
      console.error('Import execution error:', e)
      toast.error('Failed to import notebook data.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">{t('modals.import_title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('modals.select_json_file')}
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileJson className="w-8 h-8 text-indigo-500 mb-2" />
                  <p className="text-xs text-slate-600 font-medium">
                    {file ? file.name : 'Click to select .json file'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">CamoniKu backup JSON</p>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Validation Status */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {parsedData && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-800 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Valid Backup Detected</p>
                <p className="mt-0.5">
                  Notebook: <b>{parsedData.notebook.name}</b> • {parsedData.transactions.length} transactions
                </p>
              </div>
            </div>
          )}

          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('modals.target_notebook')}
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="import_mode"
                  checked={targetMode === 'create_new'}
                  onChange={() => setTargetMode('create_new')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  {t('modals.import_create_new')}
                </span>
              </label>

              {notebooks.length > 0 && (
                <label className="flex flex-col gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="import_mode"
                      checked={targetMode === 'existing'}
                      onChange={() => setTargetMode('existing')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">
                      {t('modals.import_to_existing')}
                    </span>
                  </div>
                  {targetMode === 'existing' && (
                    <select
                      value={selectedNotebookId}
                      onChange={(e) => setSelectedNotebookId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white ml-6 max-w-[85%]"
                    >
                      {notebooks.map((nb) => (
                        <option key={nb.id} value={nb.id}>
                          {nb.name} ({nb.currency})
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              )}
            </div>
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
              type="button"
              disabled={!parsedData || isImporting}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
