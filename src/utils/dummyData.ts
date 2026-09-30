import { Notebook, Classification, Category, Transaction, User } from '@/types'
import { format, subDays } from 'date-fns'

export function getDefaultClassifications(notebookId: string, lang: 'en' | 'id' = 'en'): Classification[] {
  const now = new Date().toISOString()
  const isId = lang === 'id'

  return [
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      name: isId ? 'Rumah Tangga' : 'Household',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      name: isId ? 'Pribadi' : 'Personal',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]
}

export function getDefaultCategories(notebookId: string, lang: 'en' | 'id' = 'en'): Category[] {
  const now = new Date().toISOString()
  const isId = lang === 'id'

  const names = isId
    ? ['Transportasi', 'Makanan & Minuman', 'Tagihan & Utilitas', 'Belanja Harian', 'Hiburan']
    : ['Transportation', 'F&B', 'Bills & Utilities', 'Groceries', 'Entertainment']

  return names.map((name) => ({
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name,
    is_active: true,
    created_at: now,
    updated_at: now,
  }))
}

export function generateDefaultData(user: User, lang: 'en' | 'id' = 'en'): {
  notebook: Notebook
  classifications: Classification[]
  categories: Category[]
  transactions: Transaction[]
} {
  const notebookId = crypto.randomUUID()
  const now = new Date().toISOString()
  const today = format(new Date(), 'yyyy-MM-dd')
  const isId = lang === 'id'

  const notebook: Notebook = {
    id: notebookId,
    name: isId ? 'Catatan Pengeluaran' : 'My Expenses',
    currency: 'IDR',
    owner_id: user.id,
    member_ids: [user.id],
    created_at: now,
    updated_at: now,
  }

  // Pre-made classifications based on language
  const classifications = getDefaultClassifications(notebookId, lang)
  const classHousehold = classifications[0]
  const classPersonal = classifications[1]

  // Pre-made categories based on language
  const categories = getDefaultCategories(notebookId, lang)
  const catTransport = categories[0]
  const catFnB = categories[1]
  const catBills = categories[2]
  const catGroceries = categories[3]
  const catEntertainment = categories[4]

  // In production builds, no dummy transactions are generated.
  // In development mode, mock transactions are available for UI testing.
  const transactions: Transaction[] = import.meta.env.PROD
    ? []
    : [
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classHousehold.id,
      category_id: catBills.id,
      amount: 450000,
      description: isId ? 'Tagihan Listrik & Internet' : 'Electricity & Internet Bill',
      transaction_date: today,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classHousehold.id,
      category_id: catGroceries.id,
      amount: 275000,
      description: isId ? 'Belanja mingguan supermarket' : 'Weekly supermarket restock',
      transaction_date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classPersonal.id,
      category_id: catFnB.id,
      amount: 65000,
      description: isId ? 'Makan siang & kopi' : 'Lunch & specialty coffee',
      transaction_date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classPersonal.id,
      category_id: catTransport.id,
      amount: 35000,
      description: isId ? 'Ojek online' : 'Ride hailing to downtown',
      transaction_date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classPersonal.id,
      category_id: catEntertainment.id,
      amount: 120000,
      description: isId ? 'Tiket bioskop akhir pekan' : 'Weekend cinema movie tickets',
      transaction_date: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classHousehold.id,
      category_id: catFnB.id,
      amount: 85000,
      description: isId ? 'Makan malam keluarga' : 'Family dinner takeaway',
      transaction_date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
      created_at: now,
      updated_at: now,
    },
  ]

  return {
    notebook,
    classifications,
    categories,
    transactions,
  }
}
