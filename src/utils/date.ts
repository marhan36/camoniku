import { format, parseISO, startOfMonth, endOfMonth, isValid } from 'date-fns'

export const SUPPORTED_DATE_FORMATS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-09-30)', pattern: 'yyyy-MM-dd' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (30/09/2026)', pattern: 'dd/MM/yyyy' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (09/30/2026)', pattern: 'MM/dd/yyyy' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (30-09-2026)', pattern: 'dd-MM-yyyy' },
]

export function getPatternForFormat(formatPreference: string = 'YYYY-MM-DD'): string {
  const match = SUPPORTED_DATE_FORMATS.find((f) => f.value === formatPreference)
  return match ? match.pattern : 'yyyy-MM-dd'
}

export function formatDate(dateInput: string | Date | number, formatPattern: string = 'yyyy-MM-dd'): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput)
    if (!isValid(d)) return String(dateInput)
    return format(d, formatPattern)
  } catch {
    return String(dateInput)
  }
}

export function formatDisplayDate(dateInput: string | Date | number, formatPreference: string = 'YYYY-MM-DD'): string {
  const pattern = getPatternForFormat(formatPreference)
  return formatDate(dateInput, pattern)
}

export function getMonthYearRange(year: number, month: number) {
  // month: 1-12
  const date = new Date(year, month - 1, 1)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

export function getTodayISODate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
