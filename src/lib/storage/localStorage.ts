import { User, Notebook, Classification, Category, Transaction, UserSettings } from '@/types'

const KEYS = {
  USER: 'camoniku_user',
  NOTEBOOKS: 'camoniku_notebooks',
  CLASSIFICATIONS: 'camoniku_classifications',
  CATEGORIES: 'camoniku_categories',
  TRANSACTIONS: 'camoniku_transactions',
  ACTIVE_NOTEBOOK_ID: 'camoniku_active_notebook_id',
  SETTINGS: 'camoniku_settings',
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e)
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e)
  }
}

export const localDB = {
  getUser: (): User | null => getItem<User | null>(KEYS.USER, null),
  setUser: (user: User | null): void => setItem(KEYS.USER, user),

  getNotebooks: (): Notebook[] => getItem<Notebook[]>(KEYS.NOTEBOOKS, []),
  setNotebooks: (notebooks: Notebook[]): void => setItem(KEYS.NOTEBOOKS, notebooks),

  getClassifications: (): Classification[] => getItem<Classification[]>(KEYS.CLASSIFICATIONS, []),
  setClassifications: (items: Classification[]): void => setItem(KEYS.CLASSIFICATIONS, items),

  getCategories: (): Category[] => getItem<Category[]>(KEYS.CATEGORIES, []),
  setCategories: (items: Category[]): void => setItem(KEYS.CATEGORIES, items),

  getTransactions: (): Transaction[] => getItem<Transaction[]>(KEYS.TRANSACTIONS, []),
  setTransactions: (transactions: Transaction[]): void => setItem(KEYS.TRANSACTIONS, transactions),

  getActiveNotebookId: (): string | null => getItem<string | null>(KEYS.ACTIVE_NOTEBOOK_ID, null),
  setActiveNotebookId: (id: string | null): void => setItem(KEYS.ACTIVE_NOTEBOOK_ID, id),

  getSettings: (): UserSettings =>
    getItem<UserSettings>(KEYS.SETTINGS, {
      language: (localStorage.getItem('camoniku_language') as 'en' | 'id') || 'en',
      dateFormat: 'YYYY-MM-DD',
    }),
  setSettings: (settings: UserSettings): void => {
    setItem(KEYS.SETTINGS, settings)
    localStorage.setItem('camoniku_language', settings.language)
  },

  clearUserData: (): void => {
    localStorage.removeItem(KEYS.USER)
    localStorage.removeItem(KEYS.NOTEBOOKS)
    localStorage.removeItem(KEYS.CLASSIFICATIONS)
    localStorage.removeItem(KEYS.CATEGORIES)
    localStorage.removeItem(KEYS.TRANSACTIONS)
    localStorage.removeItem(KEYS.ACTIVE_NOTEBOOK_ID)
  },

  clearAll: (): void => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  },
}
