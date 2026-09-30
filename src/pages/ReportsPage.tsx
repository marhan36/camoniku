import React, { useState, useMemo } from 'react'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate } from '@/utils/date'
import { exportElementToPdf } from '@/utils/export'
import { EmptyState } from '@/components/common/EmptyState'
import {
  FileText,
  TrendingDown,
  TrendingUp,
  Receipt,
  Flame,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { parseISO, getYear, getMonth, getDaysInMonth, subMonths } from 'date-fns'
import { toast } from 'sonner'

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

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation()
  const { getActiveNotebook } = useNotebookStore()
  const { transactions } = useTransactionStore()
  const { classifications, categories } = useMetadataStore()
  const { dateFormat } = useSettingsStore()

  const activeNotebook = getActiveNotebook()
  const notebookId = activeNotebook?.id || ''
  const currency = activeNotebook?.currency || 'IDR'

  // Month & Year Picker
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Maps
  const classificationMap = useMemo(
    () => new Map(classifications.map((c) => [c.id, c.name])),
    [classifications]
  )
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  // Current selected month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.notebook_id !== notebookId) return false
      try {
        const d = parseISO(tx.transaction_date)
        return getYear(d) === selectedYear && getMonth(d) + 1 === selectedMonth
      } catch {
        return false
      }
    })
  }, [transactions, notebookId, selectedYear, selectedMonth])

  // Previous month transactions for Month-over-Month (MoM) calculation
  const prevMonthDate = subMonths(new Date(selectedYear, selectedMonth - 1, 1), 1)
  const prevYear = getYear(prevMonthDate)
  const prevMonth = getMonth(prevMonthDate) + 1

  const prevMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.notebook_id !== notebookId) return false
      try {
        const d = parseISO(tx.transaction_date)
        return getYear(d) === prevYear && getMonth(d) + 1 === prevMonth
      } catch {
        return false
      }
    })
  }, [transactions, notebookId, prevYear, prevMonth])

  // Aggregations
  const totalAmount = useMemo(
    () => monthTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [monthTransactions]
  )
  const prevTotalAmount = useMemo(
    () => prevMonthTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [prevMonthTransactions]
  )

  // MoM calculation
  const momPercentage = useMemo(() => {
    if (prevTotalAmount === 0) return totalAmount > 0 ? 100 : 0
    return ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100
  }, [totalAmount, prevTotalAmount])

  // Average Daily Spend
  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1, 1))
  const averageDailySpend = totalAmount > 0 ? totalAmount / daysInMonth : 0

  // Top 5 Largest Transactions
  const topExpenses = useMemo(() => {
    return [...monthTransactions].sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [monthTransactions])

  // Daily Spending Trend (X: day, Y: sum amount)
  const dailyTrendData = useMemo(() => {
    const dailyMap = new Map<number, number>()
    for (let i = 1; i <= daysInMonth; i++) {
      dailyMap.set(i, 0)
    }

    monthTransactions.forEach((tx) => {
      try {
        const day = parseISO(tx.transaction_date).getDate()
        dailyMap.set(day, (dailyMap.get(day) || 0) + tx.amount)
      } catch (e) {
        console.warn('Date parse error:', e)
      }
    })

    return Array.from(dailyMap.entries()).map(([day, amount]) => ({
      day: `${day}`,
      amount,
    }))
  }, [monthTransactions, daysInMonth])

  // Expenses by Category (Pie Chart)
  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>()
    monthTransactions.forEach((tx) => {
      const name = categoryMap.get(tx.category_id) || 'Uncategorized'
      map.set(name, (map.get(name) || 0) + tx.amount)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [monthTransactions, categoryMap])

  // Expenses by Classification
  const classificationBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    monthTransactions.forEach((tx) => {
      const name = classificationMap.get(tx.classification_id) || 'Unclassified'
      const curr = map.get(name) || { total: 0, count: 0 }
      map.set(name, { total: curr.total + tx.amount, count: curr.count + 1 })
    })
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      share: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
    }))
  }, [monthTransactions, classificationMap, totalAmount])

  // Member Contribution (Bar Chart)
  const userContributionData = useMemo(() => {
    const map = new Map<string, number>()
    monthTransactions.forEach((tx) => {
      const name = tx.user_id?.length > 10 ? `${tx.user_id.slice(0, 8)}...` : tx.user_id || 'User'
      map.set(name, (map.get(name) || 0) + tx.amount)
    })
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }))
  }, [monthTransactions])

  // Export PDF Action
  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      await exportElementToPdf(
        'printable-report-area',
        `camoniku-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`
      )
      toast.success('Report PDF exported successfully')
    } catch (e) {
      console.error('PDF export failed:', e)
      toast.error('Failed to export PDF report')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('reports.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeNotebook?.name} • {monthName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month / Year Selector */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf || monthTransactions.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{t('reports.export_pdf')}</span>
          </button>
        </div>
      </div>

      {/* Main Printable / Exportable Report Content */}
      <div id="printable-report-area" className="space-y-6 bg-slate-50 p-1 sm:p-2 rounded-3xl">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Spent */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Spent
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(totalAmount, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {monthTransactions.length} transactions in {monthName}
            </p>
          </div>

          {/* Month-over-Month (MoM) Metric */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('reports.mom_change')}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h3 className="text-xl font-extrabold text-slate-900">
                {Math.abs(momPercentage).toFixed(1)}%
              </h3>
              {momPercentage > 0 ? (
                <span className="inline-flex items-center text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  Increase
                </span>
              ) : momPercentage < 0 ? (
                <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  Decrease
                </span>
              ) : (
                <span className="text-xs text-slate-400">0%</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              vs {formatCurrency(prevTotalAmount, currency)} {t('reports.from_last_month')}
            </p>
          </div>

          {/* Daily Average Spend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('reports.daily_average_spend')}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(averageDailySpend, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">calculated across {daysInMonth} days</p>
          </div>
        </div>

        {monthTransactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions for this month"
            description="Select a different month or record transactions to generate insightful financial analytics."
          />
        ) : (
          <>
            {/* Visual Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Spending Trend Line Chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    {t('reports.trend_chart_title')}
                  </h3>
                  <p className="text-xs text-slate-400">{t('reports.trend_chart_subtitle')}</p>
                </div>
                <div className="h-64 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${(val / 1000).toFixed(0)}k`
                            : val
                        }
                      />
                      <Tooltip
                        formatter={(val: unknown) => [
                          formatCurrency(Number(val) || 0, currency),
                          'Daily Spend',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#6366f1' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown Donut / Pie Chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    {t('reports.category_breakdown')}
                  </h3>
                  <p className="text-xs text-slate-400">Proportions of monthly expense</p>
                </div>
                <div className="h-64 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => [
                          formatCurrency(Number(val) || 0, currency),
                          'Amount',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* User Contribution Bar Chart (Collaborative) */}
            {userContributionData.length > 1 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
                <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {t('reports.user_breakdown')}
                    </h3>
                    <p className="text-xs text-slate-400">Spending per member</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="h-56 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userContributionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${(val / 1000).toFixed(0)}k`
                            : val
                        }
                      />
                      <Tooltip
                        formatter={(val: unknown) => [
                          formatCurrency(Number(val) || 0, currency),
                          'Contribution',
                        ]}
                      />
                      <Bar dataKey="amount" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top 5 Expenses & Classification Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 5 Expenses */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">
                    {t('reports.top_expenses')}
                  </h3>
                </div>

                <div className="mt-4 divide-y divide-slate-100">
                  {topExpenses.map((tx, idx) => {
                    const catName = categoryMap.get(tx.category_id) || 'General'
                    return (
                      <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {tx.description || catName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatDisplayDate(tx.transaction_date, dateFormat)} • {catName}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 shrink-0">
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Classification Breakdown Summary */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Classification Distribution
                  </h3>
                  <p className="text-xs text-slate-400">Overall breakdown by purpose</p>
                </div>

                <div className="mt-4 space-y-4">
                  {classificationBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <span className="text-slate-500 font-medium">
                          {formatCurrency(item.total, currency)} ({item.share.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min(100, item.share)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
