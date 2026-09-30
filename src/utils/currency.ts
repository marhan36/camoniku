export const SUPPORTED_CURRENCIES = [
  { code: 'IDR', label: 'IDR - Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID' },
  { code: 'USD', label: 'USD - US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'EUR - Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', label: 'GBP - British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'MYR', label: 'MYR - Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
  { code: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$', locale: 'en-AU' },
]

export function formatCurrency(amount: number, currencyCode: string = 'IDR'): string {
  const normalizedCode = (currencyCode || 'IDR').toUpperCase()
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === normalizedCode)
  const locale = found ? found.locale : 'en-US'

  try {
    const isZeroDecimal = ['IDR', 'JPY', 'KRW', 'VND'].includes(normalizedCode)
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCode,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount || 0)
  } catch {
    // Fallback if browser Intl doesn't recognize currency code
    const symbol = found?.symbol || normalizedCode
    return `${symbol} ${Number(amount || 0).toLocaleString()}`
  }
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0
  // Clean all non-digit and non-decimal characters
  const clean = value.replace(/[^0-9.-]+/g, '')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? 0 : parsed
}

export function getCurrencySymbol(currencyCode: string = 'IDR'): string {
  const normalizedCode = (currencyCode || 'IDR').toUpperCase()
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === normalizedCode)
  return found?.symbol || normalizedCode
}

