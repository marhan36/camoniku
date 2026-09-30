import { Notebook, Classification, Category, Transaction, User } from '@/types'
import { format, subDays } from 'date-fns'

export function generateDefaultData(user: User): {
  notebook: Notebook
  classifications: Classification[]
  categories: Category[]
  transactions: Transaction[]
} {
  const notebookId = crypto.randomUUID()
  const now = new Date().toISOString()
  const today = format(new Date(), 'yyyy-MM-dd')

  const notebook: Notebook = {
    id: notebookId,
    name: 'My Expenses',
    currency: 'IDR',
    owner_id: user.id,
    member_ids: [user.id],
    created_at: now,
    updated_at: now,
  }

  // Pre-made classifications
  const classHousehold: Classification = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'Household',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const classPersonal: Classification = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'Personal',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const classifications = [classHousehold, classPersonal]

  // Pre-made categories
  const catTransport: Category = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'Transportation',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const catFnB: Category = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'F&B',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const catBills: Category = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'Bills & Utilities',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const catGroceries: Category = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'Groceries',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const catEntertainment: Category = {
    id: crypto.randomUUID(),
    notebook_id: notebookId,
    name: 'Entertainment',
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  const categories = [catTransport, catFnB, catBills, catGroceries, catEntertainment]

  // Pre-filled dummy transactions for onboarding & charts
  const transactions: Transaction[] = [
    {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      user_id: user.id,
      classification_id: classHousehold.id,
      category_id: catBills.id,
      amount: 450000,
      description: 'Electricity & Internet Bill',
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
      description: 'Weekly supermarket restock',
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
      description: 'Lunch & specialty coffee',
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
      description: 'Ride hailing to downtown',
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
      description: 'Weekend cinema movie tickets',
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
      description: 'Family dinner takeaway',
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
