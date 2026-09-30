import { create } from 'zustand'
import { Notebook } from '@/types'
import { localDB } from '@/lib/storage/localStorage'
import { db } from '@/lib/firebase/config'
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useAuthStore } from './useAuthStore'
import { toast } from 'sonner'
import i18n from '@/i18n'

interface NotebookState {
  notebooks: Notebook[]
  activeNotebookId: string | null
  isLoading: boolean
  setNotebooks: (notebooks: Notebook[]) => void
  setActiveNotebookId: (id: string) => void
  getActiveNotebook: () => Notebook | null
  createNotebook: (name: string, currency: string) => Promise<Notebook>
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  inviteMember: (notebookId: string, memberIdOrEmail: string) => Promise<boolean>
  removeMember: (notebookId: string, memberId: string) => Promise<boolean>
  initNotebooks: () => void
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: localDB.getNotebooks(),
  activeNotebookId: localDB.getActiveNotebookId(),
  isLoading: false,

  setNotebooks: (notebooks) => {
    localDB.setNotebooks(notebooks)
    let activeId = get().activeNotebookId
    if (!activeId || !notebooks.some((n) => n.id === activeId)) {
      activeId = notebooks[0]?.id || null
      localDB.setActiveNotebookId(activeId)
    }
    set({ notebooks, activeNotebookId: activeId })
  },

  setActiveNotebookId: (id: string) => {
    localDB.setActiveNotebookId(id)
    set({ activeNotebookId: id })
    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        updateDoc(doc(db, 'users', user.id), { active_notebook_id: id })
      } catch (e) {
        console.warn('Update user active notebook error:', e)
      }
    }
  },

  getActiveNotebook: () => {
    const { notebooks, activeNotebookId } = get()
    return notebooks.find((n) => n.id === activeNotebookId) || notebooks[0] || null
  },

  createNotebook: async (name: string, currency: string) => {
    const user = useAuthStore.getState().user
    const userId = user?.id || 'guest'
    const now = new Date().toISOString()

    const newNotebook: Notebook = {
      id: crypto.randomUUID(),
      name: name.trim(),
      currency: currency || 'IDR',
      owner_id: userId,
      member_ids: [userId],
      created_at: now,
      updated_at: now,
    }

    const updatedNotebooks = [...get().notebooks, newNotebook]
    localDB.setNotebooks(updatedNotebooks)
    localDB.setActiveNotebookId(newNotebook.id)
    set({ notebooks: updatedNotebooks, activeNotebookId: newNotebook.id })

    if (user && !user.is_anonymous) {
      try {
        await setDoc(doc(db, 'notebooks', newNotebook.id), newNotebook)
      } catch (e) {
        console.warn('Error syncing created notebook to Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.notebook_created'))
    return newNotebook
  },

  updateNotebook: async (id: string, updates: Partial<Notebook>) => {
    const user = useAuthStore.getState().user
    const now = new Date().toISOString()
    const updatedNotebooks = get().notebooks.map((n) =>
      n.id === id ? { ...n, ...updates, updated_at: now } : n
    )

    localDB.setNotebooks(updatedNotebooks)
    set({ notebooks: updatedNotebooks })

    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'notebooks', id), { ...updates, updated_at: now })
      } catch (e) {
        console.warn('Error syncing updated notebook to Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.notebook_updated'))
  },

  deleteNotebook: async (id: string) => {
    const user = useAuthStore.getState().user
    const notebook = get().notebooks.find((n) => n.id === id)
    if (!notebook) return

    // Role check: Only owner can delete notebook
    if (user && !user.is_anonymous && notebook.owner_id !== user.id) {
      toast.error('Only the notebook owner can delete it.')
      return
    }

    const updatedNotebooks = get().notebooks.filter((n) => n.id !== id)
    localDB.setNotebooks(updatedNotebooks)

    // Remove associated transactions, classifications, categories locally
    const remainingTx = localDB.getTransactions().filter((t) => t.notebook_id !== id)
    const remainingClass = localDB.getClassifications().filter((c) => c.notebook_id !== id)
    const remainingCat = localDB.getCategories().filter((c) => c.notebook_id !== id)

    localDB.setTransactions(remainingTx)
    localDB.setClassifications(remainingClass)
    localDB.setCategories(remainingCat)

    // Update active notebook id
    const newActiveId = updatedNotebooks[0]?.id || null
    localDB.setActiveNotebookId(newActiveId)
    set({ notebooks: updatedNotebooks, activeNotebookId: newActiveId })

    if (user && !user.is_anonymous) {
      try {
        await deleteDoc(doc(db, 'notebooks', id))
      } catch (e) {
        console.warn('Error deleting notebook from Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.notebook_deleted'))
  },

  inviteMember: async (notebookId: string, memberIdOrEmail: string) => {
    const target = memberIdOrEmail.trim()
    if (!target) return false

    const notebook = get().notebooks.find((n) => n.id === notebookId)
    if (!notebook) return false

    if (notebook.member_ids.includes(target)) {
      toast.error('Member is already invited to this notebook.')
      return false
    }

    const updatedMembers = [...notebook.member_ids, target]
    await get().updateNotebook(notebookId, { member_ids: updatedMembers })
    toast.success(i18n.t('toasts.member_invited'))
    return true
  },

  removeMember: async (notebookId: string, memberId: string) => {
    const user = useAuthStore.getState().user
    const notebook = get().notebooks.find((n) => n.id === notebookId)
    if (!notebook) return false

    // Only owner can remove members
    if (user && !user.is_anonymous && notebook.owner_id !== user.id) {
      toast.error('Only the owner can remove members.')
      return false
    }

    // Owner cannot remove themselves
    if (notebook.owner_id === memberId) {
      toast.error('Cannot remove notebook owner.')
      return false
    }

    const updatedMembers = notebook.member_ids.filter((m) => m !== memberId)
    await get().updateNotebook(notebookId, { member_ids: updatedMembers })
    toast.success(i18n.t('toasts.member_removed'))
    return true
  },

  initNotebooks: () => {
    const nbs = localDB.getNotebooks()
    let activeId = localDB.getActiveNotebookId()
    if (!activeId || !nbs.some((n) => n.id === activeId)) {
      activeId = nbs[0]?.id || null
      localDB.setActiveNotebookId(activeId)
    }
    set({ notebooks: nbs, activeNotebookId: activeId })
  },
}))
