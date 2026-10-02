import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate, getLocalizedMonthYear } from '@/utils/date'
import { EmptyState } from '@/components/common/EmptyState'
import { TransactionModal } from '@/components/modals/TransactionModal'
import {
  TrendingUp,
  Receipt,
  Calendar,
  Plus,
  ArrowRight,
  PieChart as PieIcon,
  Tag,
  Folder,
  User as UserIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { isSameMonth, parseISO } from 'date-fns'

const CHART_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
]

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { getActiveNotebook } = useNotebookStore()
  const { transactions } = useTransactionStore()
  const { user } = useAuthStore()
  const { classifications, categories } = useMetadataStore()
  const { dateFormat } = useSettingsStore()
  const { getUserName, fetchUsers } = useUserDirectoryStore()

  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<'category' | 'classification' | 'user'>('category')

  const activeNotebook = getActiveNotebook()
  const notebookId = activeNotebook?.id || ''
  const currency = activeNotebook?.currency || 'IDR'

  // Filter transactions for active notebook & current month
  const currentMonthTransactions = useMemo(() => {
    const now = new Date()
    return transactions.filter((tx) => {
      if (tx.notebook_id !== notebookId) return false
      try {
        const txDate = parseISO(tx.transaction_date)
        return isSameMonth(txDate, now)
      } catch {
        return false
      }
    })
  }, [transactions, notebookId])

  useEffect(() => {
    const userIds = Array.from(new Set(currentMonthTransactions.map((t) => t.user_id).filter(Boolean))) as string[]
    if (userIds.length > 0) {
      fetchUsers(userIds)
    }
  }, [currentMonthTransactions, fetchUsers])

  // Summary Metrics
  const totalAmount = useMemo(
    () => currentMonthTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [currentMonthTransactions]
  )

  const daysInCurrentMonthPassed = new Date().getDate()
  const dailyAverage = totalAmount > 0 ? totalAmount / daysInCurrentMonthPassed : 0

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => t.notebook_id === notebookId)
      .sort((a, b) => {
        const getDateMs = (tx: (typeof a)) => {
          if (!tx.transaction_date) return 0
          const parts = tx.transaction_date.split('T')[0].split('-')
          if (parts.length === 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime()
          }
          return new Date(tx.transaction_date).getTime()
        }
        const getCreatedMs = (tx: (typeof a)) => (tx.created_at ? new Date(tx.created_at).getTime() : 0)

        const dateA = getDateMs(a)
        const dateB = getDateMs(b)
        if (dateB !== dateA) return dateB - dateA

        const createdA = getCreatedMs(a)
        const createdB = getCreatedMs(b)
        if (createdB !== createdA) return createdB - createdA

        return b.id.localeCompare(a.id)
      })
      .slice(0, 5)
  }, [transactions, notebookId])

  // Maps for quick name resolution
  const classificationMap = useMemo(
    () => new Map(classifications.map((c) => [c.id, c.name])),
    [classifications]
  )
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  // Chart data grouping
  const chartData = useMemo(() => {
    const map = new Map<string, number>()

    currentMonthTransactions.forEach((tx) => {
      let key = 'Other'
      if (groupBy === 'category') {
        key = categoryMap.get(tx.category_id) || t('dashboard.uncategorized')
      } else if (groupBy === 'classification') {
        key = classificationMap.get(tx.classification_id) || t('dashboard.unclassified')
      } else if (groupBy === 'user') {
        key = getUserName(tx.user_id, true, tx.user_name)
      }
      map.set(key, (map.get(key) || 0) + tx.amount)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [currentMonthTransactions, groupBy, categoryMap, classificationMap, getUserName, t])

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 text-white shadow-lg">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-white/15 text-indigo-100 backdrop-blur-xs mb-2">
            {t('dashboard.active_notebook')}: {activeNotebook?.name || 'Default'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {formatCurrency(totalAmount, currency)}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-indigo-200">
            {t('dashboard.total_expenses_month')} ({getLocalizedMonthYear(new Date(), i18n.language)})
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddTxOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm rounded-2xl shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>{t('dashboard.add_transaction')}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.daily_average')}
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(dailyAverage, currency)}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('dashboard.across_days', { count: daysInCurrentMonthPassed, days: daysInCurrentMonthPassed })}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-violet-50 text-violet-600 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.total_transactions')}
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {currentMonthTransactions.length}
            </h3>
            <p className="text-[11px] text-slate-400">{t('dashboard.this_month')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.total_recorded')}
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {transactions.filter((t) => t.notebook_id === notebookId).length}
            </h3>
            <p className="text-[11px] text-slate-400">{t('dashboard.all_time_in_notebook')}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart View (3 cols) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <Link
                to="/reports"
                className="text-base font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1 group"
              >
                <span>{t('dashboard.spending_breakdown')}</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
              </Link>
              <p className="text-xs text-slate-400">{t('dashboard.current_month_distribution')}</p>
            </div>

            {/* Group By Selector */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGroupBy('category')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  groupBy === 'category'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{t('dashboard.category')}</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('classification')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  groupBy === 'classification'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{t('dashboard.classification')}</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('user')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  groupBy === 'user'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t('dashboard.user')}</span>
              </button>
            </div>
          </div>

          {/* Chart Content */}
          <div className="flex-1 min-h-[280px] flex items-center justify-center">
            {chartData.length === 0 ? (
              <EmptyState
                icon={PieIcon}
                title={t('dashboard.no_expenses_month')}
                description={t('dashboard.add_first_transaction')}
                actionLabel={t('dashboard.add_transaction')}
                onAction={() => setIsAddTxOpen(true)}
              />
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        formatCurrency(Number(val) || 0, currency),
                        String(name || ''),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {chartData.length > 0 && (
            <Link
              to="/reports"
              className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1"
            >
              <span>{t('dashboard.click_to_view_reports')}</span>
            </Link>
          )}
        </div>

        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <Link
                to="/transactions"
                className="text-base font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1 group"
              >
                <span>{t('dashboard.recent_transactions')}</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
              </Link>
              <p className="text-xs text-slate-400">{t('dashboard.latest_activity')}</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>{t('dashboard.view_all')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 mt-4 divide-y divide-slate-100">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">
                {t('dashboard.no_recent_transactions')}
              </p>
            ) : (
              recentTransactions.map((tx) => {
                const categoryName = categoryMap.get(tx.category_id) || t('dashboard.general')
                const classificationName = classificationMap.get(tx.classification_id) || ''

                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {tx.description || categoryName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>{formatDisplayDate(tx.transaction_date, dateFormat)}</span>
                        <span>•</span>
                        <span className="truncate">{categoryName}</span>
                        {classificationName && (
                          <>
                            <span>•</span>
                            <span className="truncate">{classificationName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <TransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
      />
    </div>
  )
}
