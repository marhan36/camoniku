import { create } from 'zustand'
import { Classification, Category } from '@/types'
import { localDB } from '@/lib/storage/localStorage'
import { db } from '@/lib/firebase/config'
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useAuthStore } from './useAuthStore'
import { normalizeString } from '@/utils/normalize'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { getDefaultClassifications, getDefaultCategories } from '@/utils/dummyData'

interface MetadataState {
  classifications: Classification[]
  categories: Category[]
  isLoading: boolean
  setClassifications: (items: Classification[]) => void
  setCategories: (items: Category[]) => void
  addClassification: (notebookId: string, name: string) => Promise<Classification | null>
  addCategory: (notebookId: string, name: string) => Promise<Category | null>
  updateClassification: (id: string, name: string) => Promise<boolean>
  updateCategory: (id: string, name: string) => Promise<boolean>
  deleteClassification: (id: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  initMetadata: () => void
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
  classifications: localDB.getClassifications(),
  categories: localDB.getCategories(),
  isLoading: false,

  setClassifications: (classifications) => {
    localDB.setClassifications(classifications)
    set({ classifications })
  },

  setCategories: (categories) => {
    localDB.setCategories(categories)
    set({ categories })
  },

  addClassification: async (notebookId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(i18n.t('validation.required'))
      return null
    }

    const normalized = normalizeString(trimmed)
    const activeExisting = get().classifications.filter(
      (c) => c.notebook_id === notebookId && c.is_active !== false
    )
    const isDuplicate = activeExisting.some((c) => normalizeString(c.name) === normalized)

    if (isDuplicate) {
      toast.error(i18n.t('validation.name_unique'))
      return null
    }

    const now = new Date().toISOString()
    const user = useAuthStore.getState().user

    // Check if an inactive (deleted) classification exists with this normalized name
    const inactiveExisting = get().classifications.find(
      (c) =>
        c.notebook_id === notebookId &&
        c.is_active === false &&
        normalizeString(c.name) === normalized
    )

    if (inactiveExisting) {
      // Reactivate with the new name
      const reactivated: Classification = {
        ...inactiveExisting,
        name: trimmed,
        is_active: true,
        updated_at: now,
      }

      const updated = get().classifications.map((c) =>
        c.id === inactiveExisting.id ? reactivated : c
      )
      localDB.setClassifications(updated)
      set({ classifications: updated })

      if (user && !user.is_anonymous) {
        try {
          await updateDoc(doc(db, 'classifications', reactivated.id), {
            name: trimmed,
            is_active: true,
            updated_at: now,
          })
        } catch (e) {
          console.warn('Error reactivating classification in Firestore:', e)
        }
      }

      toast.success(i18n.t('toasts.classification_created'))
      return reactivated
    }

    const newClassification: Classification = {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      name: trimmed,
      is_active: true,
      created_at: now,
      updated_at: now,
    }

    const updated = [...get().classifications, newClassification]
    localDB.setClassifications(updated)
    set({ classifications: updated })

    if (user && !user.is_anonymous) {
      try {
        await setDoc(doc(db, 'classifications', newClassification.id), newClassification)
      } catch (e) {
        console.warn('Error syncing classification to Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.classification_created'))
    return newClassification
  },

  addCategory: async (notebookId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(i18n.t('validation.required'))
      return null
    }

    const normalized = normalizeString(trimmed)
    const activeExisting = get().categories.filter(
      (c) => c.notebook_id === notebookId && c.is_active !== false
    )
    const isDuplicate = activeExisting.some((c) => normalizeString(c.name) === normalized)

    if (isDuplicate) {
      toast.error(i18n.t('validation.name_unique'))
      return null
    }

    const now = new Date().toISOString()
    const user = useAuthStore.getState().user

    // Check if an inactive (deleted) category exists with this normalized name
    const inactiveExisting = get().categories.find(
      (c) =>
        c.notebook_id === notebookId &&
        c.is_active === false &&
        normalizeString(c.name) === normalized
    )

    if (inactiveExisting) {
      // Reactivate with the new name
      const reactivated: Category = {
        ...inactiveExisting,
        name: trimmed,
        is_active: true,
        updated_at: now,
      }

      const updated = get().categories.map((c) =>
        c.id === inactiveExisting.id ? reactivated : c
      )
      localDB.setCategories(updated)
      set({ categories: updated })

      if (user && !user.is_anonymous) {
        try {
          await updateDoc(doc(db, 'categories', reactivated.id), {
            name: trimmed,
            is_active: true,
            updated_at: now,
          })
        } catch (e) {
          console.warn('Error reactivating category in Firestore:', e)
        }
      }

      toast.success(i18n.t('toasts.category_created'))
      return reactivated
    }

    const newCategory: Category = {
      id: crypto.randomUUID(),
      notebook_id: notebookId,
      name: trimmed,
      is_active: true,
      created_at: now,
      updated_at: now,
    }

    const updated = [...get().categories, newCategory]
    localDB.setCategories(updated)
    set({ categories: updated })

    if (user && !user.is_anonymous) {
      try {
        await setDoc(doc(db, 'categories', newCategory.id), newCategory)
      } catch (e) {
        console.warn('Error syncing category to Firestore:', e)
      }
    }

    toast.success(i18n.t('toasts.category_created'))
    return newCategory
  },

  updateClassification: async (id: string, name: string) => {
    const target = get().classifications.find((c) => c.id === id)
    if (!target) return false

    const trimmed = name.trim()
    const normalized = normalizeString(trimmed)
    const existing = get().classifications.filter(
      (c) => c.notebook_id === target.notebook_id && c.id !== id
    )
    if (existing.some((c) => normalizeString(c.name) === normalized)) {
      toast.error(i18n.t('validation.name_unique'))
      return false
    }

    const now = new Date().toISOString()
    const updated = get().classifications.map((c) =>
      c.id === id ? { ...c, name: trimmed, updated_at: now } : c
    )
    localDB.setClassifications(updated)
    set({ classifications: updated })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'classifications', id), { name: trimmed, updated_at: now })
      } catch (e) {
        console.warn('Error updating classification on Firestore:', e)
      }
    }

    toast.success('Classification updated')
    return true
  },

  updateCategory: async (id: string, name: string) => {
    const target = get().categories.find((c) => c.id === id)
    if (!target) return false

    const trimmed = name.trim()
    const normalized = normalizeString(trimmed)
    const existing = get().categories.filter(
      (c) => c.notebook_id === target.notebook_id && c.id !== id
    )
    if (existing.some((c) => normalizeString(c.name) === normalized)) {
      toast.error(i18n.t('validation.name_unique'))
      return false
    }

    const now = new Date().toISOString()
    const updated = get().categories.map((c) =>
      c.id === id ? { ...c, name: trimmed, updated_at: now } : c
    )
    localDB.setCategories(updated)
    set({ categories: updated })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'categories', id), { name: trimmed, updated_at: now })
      } catch (e) {
        console.warn('Error updating category on Firestore:', e)
      }
    }

    toast.success('Category updated')
    return true
  },

  deleteClassification: async (id: string) => {
    const now = new Date().toISOString()
    const updated = get().classifications.map((c) =>
      c.id === id ? { ...c, is_active: false, updated_at: now } : c
    )
    localDB.setClassifications(updated)
    set({ classifications: updated })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'classifications', id), { is_active: false, updated_at: now })
      } catch (e) {
        console.warn('Error marking classification inactive in Firestore:', e)
      }
    }
    toast.success('Classification deleted')
  },

  deleteCategory: async (id: string) => {
    const now = new Date().toISOString()
    const updated = get().categories.map((c) =>
      c.id === id ? { ...c, is_active: false, updated_at: now } : c
    )
    localDB.setCategories(updated)
    set({ categories: updated })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'categories', id), { is_active: false, updated_at: now })
      } catch (e) {
        console.warn('Error marking category inactive in Firestore:', e)
      }
    }
    toast.success('Category deleted')
  },

  initMetadata: () => {
    let classifications = localDB.getClassifications()
    let categories = localDB.getCategories()
    const notebooks = localDB.getNotebooks()
    const lang = (localDB.getSettings().language || 'en') as 'en' | 'id'
    let hasChanges = false

    notebooks.forEach((nb) => {
      const nbClass = classifications.filter((c) => c.notebook_id === nb.id)
      if (nbClass.length === 0) {
        const defaults = getDefaultClassifications(nb.id, lang)
        classifications = [...classifications, ...defaults]
        hasChanges = true
      }

      const nbCat = categories.filter((c) => c.notebook_id === nb.id)
      if (nbCat.length === 0) {
        const defaults = getDefaultCategories(nb.id, lang)
        categories = [...categories, ...defaults]
        hasChanges = true
      }
    })

    if (hasChanges) {
      localDB.setClassifications(classifications)
      localDB.setCategories(categories)
    }

    set({
      classifications,
      categories,
    })
  },
}))
