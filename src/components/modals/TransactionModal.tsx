import React, { useState, useEffect } from 'react'
import { Transaction } from '@/types'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, parseCurrencyInput } from '@/utils/currency'
import { getTodayISODate } from '@/utils/date'
import { AddMetadataModal } from './AddMetadataModal'
import { X, Calendar, DollarSign, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TransactionModalProps {
  isOpen: boolean
  transactionToEdit?: Transaction | null
  onClose: () => void
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  transactionToEdit,
  onClose,
}) => {
  const { t } = useTranslation()
  const { getActiveNotebook } = useNotebookStore()
  const { classifications, categories } = useMetadataStore()
  const { addTransaction, updateTransaction } = useTransactionStore()

  const activeNotebook = getActiveNotebook()
  const notebookId = activeNotebook?.id || ''
  const currency = activeNotebook?.currency || 'IDR'

  // Form states
  const [date, setDate] = useState(getTodayISODate())
  const [classificationId, setClassificationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sub-modal state for "Add New..."
  const [subModalType, setSubModalType] = useState<'classification' | 'category' | null>(null)

  // Filter classifications & categories for active notebook (active ones or current edited)
  const notebookClassifications = classifications.filter(
    (c) =>
      c.notebook_id === notebookId &&
      (c.is_active !== false || c.id === transactionToEdit?.classification_id)
  )
  const notebookCategories = categories.filter(
    (c) =>
      c.notebook_id === notebookId &&
      (c.is_active !== false || c.id === transactionToEdit?.category_id)
  )

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setDate(transactionToEdit.transaction_date)
        setClassificationId(transactionToEdit.classification_id)
        setCategoryId(transactionToEdit.category_id)
        setAmountRaw(String(transactionToEdit.amount))
        setDescription(transactionToEdit.description)
      } else {
        setDate(getTodayISODate())
        setClassificationId(notebookClassifications[0]?.id || '')
        setCategoryId(notebookCategories[0]?.id || '')
        setAmountRaw('')
        setDescription('')
      }
      setErrors({})
    }
  }, [isOpen, transactionToEdit, notebookId])

  if (!isOpen) return null

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Allow digits and single dot
    const clean = val.replace(/[^0-9.]/g, '')
    setAmountRaw(clean)
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }))
  }

  const numericAmount = parseCurrencyInput(amountRaw)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!date) errs.date = t('validation.required')
    if (numericAmount <= 0) errs.amount = t('validation.amount_positive')
    if (!classificationId) errs.classificationId = t('validation.required')
    if (!categoryId) errs.categoryId = t('validation.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, {
          transaction_date: date,
          classification_id: classificationId,
          category_id: categoryId,
          amount: numericAmount,
          description: description.trim(),
        })
      } else {
        await addTransaction({
          notebook_id: notebookId,
          transaction_date: date,
          classification_id: classificationId,
          category_id: categoryId,
          amount: numericAmount,
          description: description.trim(),
        })
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {transactionToEdit ? t('modals.edit_transaction') : t('modals.add_transaction')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeNotebook?.name} ({currency})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {/* Amount input with live preview */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('transactions.amount')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountRaw}
                  onChange={handleAmountChange}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-base font-semibold focus:outline-none focus:ring-2 transition-all ${
                    errors.amount
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
              </div>
              {numericAmount > 0 && (
                <p className="mt-1 text-xs font-medium text-indigo-600">
                  Formatted: {formatCurrency(numericAmount, currency)}
                </p>
              )}
              {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount}</p>}
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('transactions.date')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date}</p>}
            </div>

            {/* Classification & Category grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Classification */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('transactions.classification')} *
                </label>
                <div className="space-y-1">
                  <select
                    value={classificationId}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setSubModalType('classification')
                      } else {
                        setClassificationId(e.target.value)
                        if (errors.classificationId)
                          setErrors((prev) => ({ ...prev, classificationId: '' }))
                      }
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                      errors.classificationId
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                  >
                    <option value="" disabled>
                      Select Classification
                    </option>
                    {notebookClassifications.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="font-semibold text-indigo-600">
                      + Add New Classification...
                    </option>
                  </select>
                </div>
                {errors.classificationId && (
                  <p className="mt-1 text-xs text-rose-500">{errors.classificationId}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('transactions.category')} *
                </label>
                <div className="space-y-1">
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setSubModalType('category')
                      } else {
                        setCategoryId(e.target.value)
                        if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }))
                      }
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                      errors.categoryId
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                    }`}
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    {notebookCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="font-semibold text-indigo-600">
                      + Add New Category...
                    </option>
                  </select>
                </div>
                {errors.categoryId && (
                  <p className="mt-1 text-xs text-rose-500">{errors.categoryId}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('transactions.description')}
              </label>
              <textarea
                rows={3}
                placeholder="What was this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>

            {/* Actions */}
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
                {transactionToEdit ? 'Save Changes' : 'Record Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-modal for Add Classification or Category */}
      {subModalType && (
        <AddMetadataModal
          isOpen={true}
          type={subModalType}
          notebookId={notebookId}
          onClose={() => setSubModalType(null)}
          onSuccess={(newId) => {
            if (subModalType === 'classification') {
              setClassificationId(newId)
            } else {
              setCategoryId(newId)
            }
          }}
        />
      )}
    </>
  )
}
