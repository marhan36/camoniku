import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate, getLocalizedMonthName } from '@/utils/date'
import { exportTransactionsToExcel } from '@/utils/export'
import { Transaction } from '@/types'
import { TransactionModal } from '@/components/modals/TransactionModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { EmptyState } from '@/components/common/EmptyState'
import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown'
import {
  Plus,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Receipt,
  Loader2,
  User as UserIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseISO, getYear, getMonth } from 'date-fns'

const INITIAL_LOAD_COUNT = 25
const LOAD_MORE_STEP = 20

export const TransactionsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { getActiveNotebook } = useNotebookStore()
  const { transactions, deleteTransaction } = useTransactionStore()
  const { classifications, categories } = useMetadataStore()
  const { dateFormat } = useSettingsStore()
  const { getUserName, fetchUsers } = useUserDirectoryStore()

  const activeNotebook = getActiveNotebook()
  const notebookId = activeNotebook?.id || ''
  const currency = activeNotebook?.currency || 'IDR'

  // Month/Year filter (default current month)
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1) // 1-12

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUser, setFilterUser] = useState<string>('ALL')
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'lowest' | 'highest'>('newest')

  // Infinite Scroll state
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_LOAD_COUNT)
  const observerRef = useRef<HTMLDivElement | null>(null)

  // Modals state
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Active notebook classifications & categories (for filter dropdowns)
  const notebookClassifications = useMemo(
    () => classifications.filter((c) => c.notebook_id === notebookId && c.is_active !== false),
    [classifications, notebookId]
  )
  const notebookCategories = useMemo(
    () => categories.filter((c) => c.notebook_id === notebookId && c.is_active !== false),
    [categories, notebookId]
  )

  // Maps include all items (active and inactive) so historical transaction names display properly
  const classificationMap = useMemo(
    () =>
      new Map(
        classifications.filter((c) => c.notebook_id === notebookId).map((c) => [c.id, c.name])
      ),
    [classifications, notebookId]
  )
  const categoryMap = useMemo(
    () =>
      new Map(
        categories.filter((c) => c.notebook_id === notebookId).map((c) => [c.id, c.name])
      ),
    [categories, notebookId]
  )

  // Available users in transactions for filter dropdown
  const availableUsers = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((tx) => {
      if (tx.notebook_id === notebookId && tx.user_id) {
        set.add(tx.user_id)
      }
    })
    return Array.from(set)
  }, [transactions, notebookId])

  useEffect(() => {
    if (availableUsers.length > 0) {
      fetchUsers(availableUsers)
    }
  }, [availableUsers, fetchUsers])

  // Filtered & Sorted Transactions for selected month/year
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (tx.notebook_id !== notebookId) return false

        // Month & Year filter
        try {
          const dateObj = parseISO(tx.transaction_date)
          if (getYear(dateObj) !== selectedYear || getMonth(dateObj) + 1 !== selectedMonth) {
            return false
          }
        } catch {
          return false
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const desc = (tx.description || '').toLowerCase()
          const cat = (categoryMap.get(tx.category_id) || '').toLowerCase()
          const cls = (classificationMap.get(tx.classification_id) || '').toLowerCase()
          if (!desc.includes(q) && !cat.includes(q) && !cls.includes(q)) {
            return false
          }
        }

        // Filters
        if (filterUser !== 'ALL' && tx.user_id !== filterUser) return false
        if (
          selectedClassifications.length > 0 &&
          !selectedClassifications.includes(tx.classification_id)
        ) {
          return false
        }
        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(tx.category_id)
        ) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        }
        if (sortBy === 'oldest') {
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        }
        if (sortBy === 'lowest') {
          return a.amount - b.amount
        }
        if (sortBy === 'highest') {
          return b.amount - a.amount
        }
        return 0
      })
  }, [
    transactions,
    notebookId,
    selectedYear,
    selectedMonth,
    searchQuery,
    filterUser,
    selectedClassifications,
    selectedCategories,
    sortBy,
    categoryMap,
    classificationMap,
  ])

  // Infinite scroll calculation
  const totalItems = filteredTransactions.length
  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount)
  }, [filteredTransactions, visibleCount])

  const hasMore = visibleCount < totalItems

  // Reset visibleCount when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD_COUNT)
  }, [
    selectedYear,
    selectedMonth,
    searchQuery,
    filterUser,
    selectedClassifications,
    selectedCategories,
    sortBy,
  ])

  // Auto load more when scrolling near bottom
  useEffect(() => {
    if (!hasMore) return
  const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, totalItems))
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const currentEl = observerRef.current
    if (currentEl) {
      observer.observe(currentEl)
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl)
      }
    }
  }, [hasMore, totalItems])

  // Handle Export to Excel
  const handleExportExcel = () => {
    exportTransactionsToExcel({
      transactions: filteredTransactions,
      classifications: notebookClassifications,
      categories: notebookCategories,
      currency,
      dateFormat,
      filename: `camoniku-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`,
    })
  }

  // Delete action with custom Confirmation Modal
  const handleDeleteConfirm = async () => {
    if (!deletingTransactionId) return
    setIsDeleting(true)
    try {
      await deleteTransaction(deletingTransactionId)
    } finally {
      setIsDeleting(false)
      setDeletingTransactionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('transactions.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeNotebook?.name} ({currency})
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('transactions.export_excel')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddTxOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('transactions.add_new')}</span>
          </button>
        </div>
      </div>

      {/* Month/Year Selector & Filters Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Month / Year */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('transactions.month_and_year')}
            </label>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-2/3 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-100"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getLocalizedMonthName(m, i18n.language)}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-1/3 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-100"
              >
                {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('transactions.search')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={t('transactions.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Classification Multi-Select */}
          <div>
            <MultiSelectDropdown
              label={t('transactions.classification')}
              placeholder={t('transactions.filter_classification')}
              options={notebookClassifications.map((c) => ({ id: c.id, name: c.name }))}
              selectedIds={selectedClassifications}
              onChange={setSelectedClassifications}
            />
          </div>

          {/* Category Multi-Select */}
          <div>
            <MultiSelectDropdown
              label={t('transactions.category')}
              placeholder={t('transactions.filter_category')}
              options={notebookCategories.map((c) => ({ id: c.id, name: c.name }))}
              selectedIds={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>
        </div>

        {/* Secondary Filter Row: Member & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            {availableUsers.length > 1 && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <UserIcon className="w-3.5 h-3.5" />
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="ALL">{t('transactions.filter_user')}</option>
                  {availableUsers.map((u) => (
                    <option key={u} value={u}>
                      {getUserName(u, true)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-400 font-medium">{t('transactions.sort')}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-700"
            >
              <option value="newest">{t('transactions.sort_newest')}</option>
              <option value="oldest">{t('transactions.sort_oldest')}</option>
              <option value="lowest">{t('transactions.sort_lowest')}</option>
              <option value="highest">{t('transactions.sort_highest')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List / Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('transactions.no_transactions')}
            description={t('transactions.no_transactions_desc')}
            actionLabel={t('transactions.add_new')}
            onAction={() => setIsAddTxOpen(true)}
            className="border-none shadow-none"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">{t('transactions.date')}</th>
                    <th className="py-3.5 px-4">{t('transactions.category')}</th>
                    <th className="py-3.5 px-4">{t('transactions.classification')}</th>
                    <th className="py-3.5 px-4">{t('transactions.description')}</th>
                    <th className="py-3.5 px-4">{t('transactions.user')}</th>
                    <th className="py-3.5 px-6 text-right">{t('transactions.amount')}</th>
                    <th className="py-3.5 px-6 text-right">{t('transactions.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {displayedTransactions.map((tx) => {
                    const categoryName = categoryMap.get(tx.category_id) || t('dashboard.uncategorized')
                    const classificationName =
                      classificationMap.get(tx.classification_id) || t('dashboard.unclassified')

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-6 text-xs font-medium text-slate-600">
                          {formatDisplayDate(tx.transaction_date, dateFormat)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs">
                            {categoryName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                            {classificationName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                          {tx.description || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {getUserName(tx.user_id, false, tx.user_name)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                          {formatCurrency(tx.amount, currency)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingTransaction(tx)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title={t('transactions.edit_tooltip')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTransactionId(tx.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title={t('transactions.delete_tooltip')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedTransactions.map((tx) => {
                const categoryName = categoryMap.get(tx.category_id) || t('dashboard.uncategorized')
                const classificationName =
                  classificationMap.get(tx.classification_id) || t('dashboard.unclassified')

                return (
                  <div key={tx.id} className="p-4 space-y-2 hover:bg-slate-50/70 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {formatDisplayDate(tx.transaction_date, dateFormat)}
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        {categoryName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {classificationName}
                      </span>
                    </div>

                    {tx.description && (
                      <p className="text-xs text-slate-600 leading-normal">{tx.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        {t('transactions.by')} {getUserName(tx.user_id, false, tx.user_name)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingTransaction(tx)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTransactionId(tx.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Infinite Scroll Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50">
              {hasMore ? (
                <div
                  ref={observerRef}
                  className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs"
                >
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('transactions.loading_more')}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {displayedTransactions.length} {t('transactions.of')} {totalItems}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, totalItems))
                    }
                    className="mt-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {t('transactions.load_more')}
                  </button>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  {t('transactions.showing_all', { total: totalItems })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isAddTxOpen || !!editingTransaction}
        transactionToEdit={editingTransaction}
        onClose={() => {
          setIsAddTxOpen(false)
          setEditingTransaction(null)
        }}
      />

      {/* Custom Reusable Delete Confirmation Modal (CRITICAL) */}
      <ConfirmModal
        isOpen={!!deletingTransactionId}
        title={t('modals.confirm_delete_title')}
        message={t('transactions.confirm_delete_message')}
        confirmText={t('modals.confirm')}
        cancelText={t('modals.cancel')}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTransactionId(null)}
      />
    </div>
  )
}
