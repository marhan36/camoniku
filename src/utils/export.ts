import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { z } from 'zod'
import { Transaction, Classification, Category, Notebook, NotebookExportData } from '@/types'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { formatCurrency } from './currency'
import { formatDisplayDate } from './date'

/**
 * Exports current transactions to Excel (.xlsx) using SheetJS
 */
export function exportTransactionsToExcel({
  transactions,
  classifications,
  categories,
  currency,
  dateFormat,
  filename = 'camoniku-transactions.xlsx',
}: {
  transactions: Transaction[]
  classifications: Classification[]
  categories: Category[]
  currency: string
  dateFormat: string
  filename?: string
}) {
  const classificationMap = new Map(classifications.map((c) => [c.id, c.name]))
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const getUserName = useUserDirectoryStore.getState().getUserName

  const rows = transactions.map((t, idx) => ({
    No: idx + 1,
    Date: formatDisplayDate(t.transaction_date, dateFormat),
    Member: getUserName(t.user_id, false, t.user_name),
    Classification: classificationMap.get(t.classification_id) || 'Unknown',
    Category: categoryMap.get(t.category_id) || 'Unknown',
    Description: t.description || '-',
    Amount: t.amount,
    'Formatted Amount': formatCurrency(t.amount, currency),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Date
    { wch: 16 }, // Member
    { wch: 18 }, // Classification
    { wch: 20 }, // Category
    { wch: 32 }, // Description
    { wch: 14 }, // Amount
    { wch: 18 }, // Formatted Amount
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  XLSX.writeFile(workbook, filename)
}

/**
 * Captures an HTML element and exports it as a clean PDF
 */
export async function exportElementToPdf(
  elementId: string,
  filename: string = 'camoniku-report.pdf'
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`)
  }

  // Render canvas with higher scale for sharp crisp rendering
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  // If content spans more than one page
  let heightLeft = pdfHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
  heightLeft -= pdf.internal.pageSize.getHeight()

  while (heightLeft > 0) {
    position = heightLeft - pdfHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
    heightLeft -= pdf.internal.pageSize.getHeight()
  }

  pdf.save(filename)
}

/**
 * Zod schema to strictly validate imported JSON files
 */
export const notebookExportSchema = z.object({
  notebook: z.object({
    id: z.string(),
    name: z.string().min(1),
    currency: z.string(),
    owner_id: z.string(),
    member_ids: z.array(z.string()).optional().default([]),
  }),
  classifications: z.array(
    z.object({
      id: z.string(),
      notebook_id: z.string(),
      name: z.string(),
      is_active: z.boolean().optional().default(true),
    })
  ),
  categories: z.array(
    z.object({
      id: z.string(),
      notebook_id: z.string(),
      name: z.string(),
      is_active: z.boolean().optional().default(true),
    })
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      notebook_id: z.string(),
      user_id: z.string(),
      classification_id: z.string(),
      category_id: z.string(),
      amount: z.number(),
      description: z.string().optional().default(''),
      transaction_date: z.string(),
    })
  ),
})

export function validateNotebookImport(data: unknown): NotebookExportData {
  return notebookExportSchema.parse(data) as unknown as NotebookExportData
}
