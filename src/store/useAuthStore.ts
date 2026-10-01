import { create } from 'zustand'
import { User } from '@/types'
import { auth, googleProvider, signInWithPopup, firebaseSignOut, db } from '@/lib/firebase/config'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { localDB } from '@/lib/storage/localStorage'
import { generateDefaultData } from '@/utils/dummyData'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { useNotebookStore } from './useNotebookStore'
import { useMetadataStore } from './useMetadataStore'
import { useTransactionStore } from './useTransactionStore'
import { useUserDirectoryStore } from './useUserDirectoryStore'
import { useNetworkStore } from './useNetworkStore'

interface AuthState {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: User | null) => void
  loginWithGoogle: () => Promise<User | null>
  continueAsGuest: (name: string) => User
  updateProfileName: (name: string) => Promise<void>
  logout: () => Promise<void>
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => {
    localDB.setUser(user)
    set({ user })
  },

  continueAsGuest: (name: string) => {
    const now = new Date().toISOString()
    const guestUser: User = {
      id: `guest_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim() || 'Guest User',
      email: null,
      active_notebook_id: null,
      created_at: now,
      updated_at: now,
      is_anonymous: true,
    }

    const lang = (localDB.getSettings().language || 'en') as 'en' | 'id'
    
    // Only reuse existing local notebooks if they genuinely belong to a guest session
    const existingNotebooks = localDB.getNotebooks()
    const isGenuinelyGuestData =
      existingNotebooks.length > 0 &&
      existingNotebooks.every((nb) => nb.owner_id?.startsWith('guest'))

    let notebooks = existingNotebooks

    if (!isGenuinelyGuestData) {
      // Clear any lingering data from previous accounts
      localDB.clearUserData()

      const defaultData = generateDefaultData(guestUser, lang)
      guestUser.active_notebook_id = defaultData.notebook.id
      notebooks = [defaultData.notebook]

      localDB.setNotebooks(notebooks)
      localDB.setClassifications(defaultData.classifications)
      localDB.setCategories(defaultData.categories)
      localDB.setTransactions(defaultData.transactions)
      localDB.setActiveNotebookId(defaultData.notebook.id)

      useNotebookStore.getState().setNotebooks(notebooks)
      useNotebookStore.getState().setActiveNotebookId(defaultData.notebook.id)
      useMetadataStore.getState().setClassifications(defaultData.classifications)
      useMetadataStore.getState().setCategories(defaultData.categories)
      useTransactionStore.getState().setTransactions(defaultData.transactions)
    } else {
      const activeId = localDB.getActiveNotebookId() || notebooks[0].id
      guestUser.active_notebook_id = activeId
      useNotebookStore.getState().setNotebooks(notebooks)
      useNotebookStore.getState().setActiveNotebookId(activeId)
    }

    localDB.setUser(guestUser)
    set({ user: guestUser, isLoading: false })
    toast.success(`${i18n.t('auth.logged_in_as')} ${guestUser.name}`)
    return guestUser
  },

  loginWithGoogle: async () => {
    set({ isLoading: true })
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user
      const now = new Date().toISOString()

      const userDocRef = doc(db, 'users', fbUser.uid)
      const userSnap = await getDoc(userDocRef)

      let userData: User

      if (userSnap.exists()) {
        userData = userSnap.data() as User
        // Clear lingering local data so useSync starts fresh with cloud data
        localDB.clearUserData()
        useNotebookStore.getState().setNotebooks([])
        useNotebookStore.getState().setActiveNotebookId(null)
        useTransactionStore.getState().setTransactions([])
        useMetadataStore.getState().setClassifications([])
        useMetadataStore.getState().setCategories([])
      } else {
        // New user
        userData = {
          id: fbUser.uid,
          name: fbUser.displayName || 'CamoniKu User',
          email: fbUser.email,
          active_notebook_id: null,
          created_at: now,
          updated_at: now,
          is_anonymous: false,
        }

        // Migrate local guest data only if currently logged in as a guest with genuine guest notebooks
        const localNotebooks = localDB.getNotebooks()
        const isGuestPrev =
          Boolean(get().user?.is_anonymous) &&
          localNotebooks.length > 0 &&
          localNotebooks.every((nb) => nb.owner_id?.startsWith('guest'))

        if (isGuestPrev && localNotebooks.length > 0) {
          // Re-assign local guest notebooks to this Google account
          const migratedNotebooks = localNotebooks.map((nb) => ({
            ...nb,
            owner_id: fbUser.uid,
            member_ids: Array.from(new Set([...nb.member_ids, fbUser.uid])),
          }))
          const localTransactions = localDB.getTransactions().map((t) => ({
            ...t,
            user_id: fbUser.uid,
          }))

          localDB.setNotebooks(migratedNotebooks)
          localDB.setTransactions(localTransactions)

          // Save migrated data to Firestore
          try {
            for (const nb of migratedNotebooks) {
              await setDoc(doc(db, 'notebooks', nb.id), nb)
            }
            for (const c of localDB.getClassifications()) {
              await setDoc(doc(db, 'classifications', c.id), c)
            }
            for (const cat of localDB.getCategories()) {
              await setDoc(doc(db, 'categories', cat.id), cat)
            }
            for (const tx of localTransactions) {
              await setDoc(doc(db, 'transactions', tx.id), tx)
            }
          } catch (syncErr) {
            console.warn('Initial firestore migration warning:', syncErr)
          }

          userData.active_notebook_id = migratedNotebooks[0]?.id || null
        } else {
          // Fresh Google user, generate default onboarding notebook
          const lang = (localDB.getSettings().language || 'en') as 'en' | 'id'
          const defaultData = generateDefaultData(userData, lang)
          userData.active_notebook_id = defaultData.notebook.id

          try {
            await setDoc(doc(db, 'notebooks', defaultData.notebook.id), defaultData.notebook)
            for (const c of defaultData.classifications) {
              await setDoc(doc(db, 'classifications', c.id), c)
            }
            for (const cat of defaultData.categories) {
              await setDoc(doc(db, 'categories', cat.id), cat)
            }
            for (const tx of defaultData.transactions) {
              await setDoc(doc(db, 'transactions', tx.id), tx)
            }
          } catch (syncErr) {
            console.warn('Firestore initial notebook creation warning:', syncErr)
          }

          localDB.setNotebooks([defaultData.notebook])
          localDB.setClassifications(defaultData.classifications)
          localDB.setCategories(defaultData.categories)
          localDB.setTransactions(defaultData.transactions)
          localDB.setActiveNotebookId(defaultData.notebook.id)

          useNotebookStore.getState().setNotebooks([defaultData.notebook])
          useMetadataStore.getState().setClassifications(defaultData.classifications)
          useMetadataStore.getState().setCategories(defaultData.categories)
          useTransactionStore.getState().setTransactions(defaultData.transactions)
        }

        await setDoc(userDocRef, userData)
      }

      localDB.setUser(userData)
      set({ user: userData, isLoading: false })
      toast.success(`${i18n.t('auth.logged_in_as')} ${userData.name}`)
      return userData
    } catch (err: unknown) {
      console.error('Google Sign-in Error:', err)
      set({ isLoading: false })
      const authError = err as { code?: string; message?: string }
      if (authError?.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname
        toast.error(
          `Domain "${domain}" is not authorized in Firebase. Please add "${domain}" in Firebase Console > Authentication > Settings > Authorized domains.`,
          { duration: 12000 }
        )
      } else if (authError?.code === 'auth/popup-closed-by-user') {
        toast.info('Google sign-in popup was closed before completing.')
      } else if (authError?.code === 'auth/popup-blocked') {
        toast.error('Google sign-in popup was blocked by browser. Please allow popups for this site.')
      } else {
        const errorMsg = authError?.message || 'Google sign-in failed'
        toast.error(errorMsg)
      }
      return null
    }
  },

  updateProfileName: async (name: string) => {
    const user = get().user
    if (!user) return
    const updated = { ...user, name: name.trim(), updated_at: new Date().toISOString() }

    localDB.setUser(updated)
    set({ user: updated })

    useUserDirectoryStore.getState().setUserProfile(user.id, {
      id: user.id,
      name: updated.name,
      email: user.email,
    })

    if (!user.is_anonymous) {
      try {
        const userDocRef = doc(db, 'users', user.id)
        await updateDoc(userDocRef, { name: updated.name, updated_at: updated.updated_at })
      } catch (e) {
        console.error('Error updating firestore user name:', e)
      }
    }
    toast.success(i18n.t('toasts.profile_updated'))
  },

  logout: async () => {
    try {
      await firebaseSignOut(auth)
    } catch (e) {
      console.warn('Firebase signout:', e)
    }
    // Purge local user data while keeping settings
    localDB.clearUserData()
    useNotebookStore.getState().setNotebooks([])
    useNotebookStore.getState().setActiveNotebookId(null)
    useTransactionStore.getState().setTransactions([])
    useMetadataStore.getState().setClassifications([])
    useMetadataStore.getState().setCategories([])
    useUserDirectoryStore.getState().clearUsers()
    useNetworkStore.getState().setSyncStatus('local_only')
    set({ user: null })
  },

  initAuth: async () => {
    // Check local user first
    const savedUser = localDB.getUser()
    if (savedUser) {
      set({ user: savedUser, isLoading: false, isInitialized: true })
      return
    }

    // Otherwise, listen for firebase auth state
    set({ isLoading: false, isInitialized: true })
  },
}))
