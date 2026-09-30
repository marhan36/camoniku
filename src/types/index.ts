export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'MYR' | 'AUD'

export interface User {
  id: string
  name: string
  email: string | null
  active_notebook_id: string | null
  created_at: string
  updated_at: string
  is_anonymous: boolean
}

export interface PendingMemberInvite {
  id: string
  email: string
  created_at: string
}

export interface NotebookInvitation {
  id: string
  notebook_id: string
  notebook_name: string
  currency: string
  owner_id: string
  owner_name: string
  owner_email: string | null
  invitee_email: string
  status: 'pending' | 'accepted' | 'declined' | 'revoked'
  created_at: string
  updated_at: string
  accepted_at?: string
  accepted_by?: string
  accepted_by_name?: string
  accepted_by_email?: string
}

export interface Notebook {
  id: string
  name: string
  currency: CurrencyCode | string
  owner_id: string
  member_ids: string[]
  pending_invites?: PendingMemberInvite[]
  created_at: string
  updated_at: string
}

export interface Classification {
  id: string
  notebook_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  notebook_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  notebook_id: string
  user_id: string
  user_name?: string
  classification_id: string
  category_id: string
  amount: number
  description: string
  transaction_date: string // ISO string or YYYY-MM-DD
  created_at: string
  updated_at: string
}

export interface UserSettings {
  language: 'en' | 'id'
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD-MM-YYYY'
}

export type NetworkSyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'local_only' | 'error'

export interface NotebookExportData {
  notebook: Notebook
  classifications: Classification[]
  categories: Category[]
  transactions: Transaction[]
  export_version: string
  exported_at: string
}
