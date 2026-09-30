import { create } from 'zustand'
import { Notebook, PendingMemberInvite, NotebookInvitation } from '@/types'
import { localDB } from '@/lib/storage/localStorage'
import { db } from '@/lib/firebase/config'
import { doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore'
import { useAuthStore } from './useAuthStore'
import { useUserDirectoryStore } from './useUserDirectoryStore'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { getDefaultClassifications, getDefaultCategories } from '@/utils/dummyData'
import { useMetadataStore } from './useMetadataStore'

interface NotebookState {
  notebooks: Notebook[]
  activeNotebookId: string | null
  isLoading: boolean
  setNotebooks: (notebooks: Notebook[]) => void
  setActiveNotebookId: (id: string) => void
  getActiveNotebook: () => Notebook | null
  createNotebook: (name: string, currency: string, setAsActive?: boolean) => Promise<Notebook>
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  inviteMember: (notebookId: string, memberIdOrEmail: string) => Promise<boolean>
  inviteMemberByEmail: (
    notebookId: string,
    email: string
  ) => Promise<{ success: boolean; inviteId?: string; inviteUrl?: string; error?: string }>
  revokeInvitation: (notebookId: string, inviteId: string) => Promise<boolean>
  acceptInvitation: (inviteId: string) => Promise<{ success: boolean; notebookId?: string; error?: string }>
  declineInvitation: (inviteId: string) => Promise<boolean>
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

  createNotebook: async (name: string, currency: string, setAsActive: boolean = true) => {
    const user = useAuthStore.getState().user
    const userId = user?.id || 'guest'
    const now = new Date().toISOString()
    const lang = (localDB.getSettings().language || 'en') as 'en' | 'id'

    const newNotebook: Notebook = {
      id: crypto.randomUUID(),
      name: name.trim(),
      currency: currency || 'IDR',
      owner_id: userId,
      member_ids: [userId],
      created_at: now,
      updated_at: now,
    }

    // Auto-create 2 default classifications and 5 default categories reflecting chosen language
    const defaultClass = getDefaultClassifications(newNotebook.id, lang)
    const defaultCats = getDefaultCategories(newNotebook.id, lang)

    const currentClass = localDB.getClassifications().filter((c) => c.notebook_id !== newNotebook.id)
    const currentCats = localDB.getCategories().filter((c) => c.notebook_id !== newNotebook.id)
    const updatedClass = [...currentClass, ...defaultClass]
    const updatedCats = [...currentCats, ...defaultCats]

    localDB.setClassifications(updatedClass)
    localDB.setCategories(updatedCats)
    useMetadataStore.getState().setClassifications(updatedClass)
    useMetadataStore.getState().setCategories(updatedCats)

    const updatedNotebooks = [...get().notebooks, newNotebook]
    localDB.setNotebooks(updatedNotebooks)

    if (setAsActive) {
      localDB.setActiveNotebookId(newNotebook.id)
      set({ notebooks: updatedNotebooks, activeNotebookId: newNotebook.id })
    } else {
      set({ notebooks: updatedNotebooks })
    }

    if (user && !user.is_anonymous) {
      try {
        await setDoc(doc(db, 'notebooks', newNotebook.id), newNotebook)
        for (const c of defaultClass) {
          await setDoc(doc(db, 'classifications', c.id), c)
        }
        for (const cat of defaultCats) {
          await setDoc(doc(db, 'categories', cat.id), cat)
        }
        if (setAsActive) {
          await updateDoc(doc(db, 'users', user.id), { active_notebook_id: newNotebook.id })
        }
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

    const isOwner = user
      ? notebook.owner_id === user.id ||
        (user.is_anonymous && (notebook.owner_id === 'guest' || notebook.owner_id === user.id))
      : true

    // Role check: Only owner can delete notebook
    if (!isOwner) {
      toast.error('Only the notebook owner can delete it.')
      return
    }

    // Must keep at least 1 owned notebook
    const ownedNotebooks = get().notebooks.filter((n) =>
      user
        ? n.owner_id === user.id ||
          (user.is_anonymous && (n.owner_id === 'guest' || n.owner_id === user.id))
        : true
    )

    if (ownedNotebooks.length <= 1) {
      toast.error(i18n.t('notebooks.keep_at_least_one', 'You must keep at least 1 notebook that you own.'))
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
    useMetadataStore.getState().setClassifications(remainingClass)
    useMetadataStore.getState().setCategories(remainingCat)

    // Update active notebook id if current active was deleted
    let newActiveId = get().activeNotebookId
    if (newActiveId === id) {
      const remainingOwned = updatedNotebooks.filter((n) =>
        user
          ? n.owner_id === user.id ||
            (user.is_anonymous && (n.owner_id === 'guest' || n.owner_id === user.id))
          : true
      )
      newActiveId = remainingOwned[0]?.id || updatedNotebooks[0]?.id || null
      localDB.setActiveNotebookId(newActiveId)
      if (user && !user.is_anonymous && newActiveId) {
        try {
          updateDoc(doc(db, 'users', user.id), { active_notebook_id: newActiveId })
        } catch (e) {
          console.warn('Update user active notebook error:', e)
        }
      }
    }

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

  inviteMemberByEmail: async (notebookId: string, email: string) => {
    const user = useAuthStore.getState().user
    const targetEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(targetEmail)) {
      toast.error('Please enter a valid email address.')
      return { success: false, error: 'Invalid email address' }
    }

    const notebook = get().notebooks.find((n) => n.id === notebookId)
    if (!notebook) return { success: false, error: 'Notebook not found' }

    if (user?.email && targetEmail === user.email.toLowerCase()) {
      toast.error('You cannot invite yourself to your own notebook.')
      return { success: false, error: 'Cannot invite yourself' }
    }

    // Check if already an active member (by UID or email)
    const userDirectory = useUserDirectoryStore.getState().users
    const isAlreadyMember = notebook.member_ids.some((mid) => {
      if (mid.toLowerCase() === targetEmail) return true
      const u = userDirectory[mid]
      return u?.email?.toLowerCase() === targetEmail
    })
    if (isAlreadyMember) {
      toast.error('This user is already a member of this notebook.')
      return { success: false, error: 'Already a member' }
    }

    // Check if already pending
    const existingPending = notebook.pending_invites?.find(
      (p) => p.email.toLowerCase() === targetEmail
    )
    if (existingPending) {
      const baseUrl = window.location.href.split('#')[0].replace(/\/+$/, '')
      const inviteUrl = `${baseUrl}/#/invite/${existingPending.id}`
      toast.info('An invitation is already pending for this email.')
      return {
        success: false,
        error: 'already_pending',
        inviteId: existingPending.id,
        inviteUrl,
      }
    }

    const inviteId = crypto.randomUUID()
    const baseUrl = window.location.href.split('#')[0].replace(/\/+$/, '')
    const inviteUrl = `${baseUrl}/#/invite/${inviteId}`
    const now = new Date().toISOString()

    const invitation: NotebookInvitation = {
      id: inviteId,
      notebook_id: notebook.id,
      notebook_name: notebook.name,
      currency: notebook.currency,
      owner_id: user?.id || notebook.owner_id,
      owner_name: user?.name || 'Notebook Owner',
      owner_email: user?.email || null,
      invitee_email: targetEmail,
      status: 'pending',
      created_at: now,
      updated_at: now,
    }

    // 1. Save invitation to Firestore if authenticated
    if (user && !user.is_anonymous) {
      try {
        await setDoc(doc(db, 'invitations', inviteId), invitation)
      } catch (e) {
        console.warn('Error saving invitation doc to Firestore:', e)
      }
    }

    // 2. Update pending_invites on notebook
    const newPendingItem: PendingMemberInvite = {
      id: inviteId,
      email: targetEmail,
      created_at: now,
    }
    const currentPending = notebook.pending_invites || []
    const updatedPending = [...currentPending.filter((p) => p.email.toLowerCase() !== targetEmail), newPendingItem]
    await get().updateNotebook(notebookId, { pending_invites: updatedPending })

    toast.success(`Invitation created for ${targetEmail}`)
    return { success: true, inviteId, inviteUrl }
  },

  inviteMember: async (notebookId: string, memberIdOrEmail: string) => {
    const res = await get().inviteMemberByEmail(notebookId, memberIdOrEmail)
    return res.success
  },

  revokeInvitation: async (notebookId: string, inviteId: string) => {
    const notebook = get().notebooks.find((n) => n.id === notebookId)
    if (!notebook) return false

    const updatedPending = (notebook.pending_invites || []).filter((p) => p.id !== inviteId)
    await get().updateNotebook(notebookId, { pending_invites: updatedPending })

    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'invitations', inviteId), {
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Error revoking invitation doc:', e)
      }
    }

    toast.success('Invitation revoked.')
    return true
  },

  acceptInvitation: async (inviteId: string) => {
    const user = useAuthStore.getState().user
    if (!user || user.is_anonymous) {
      return { success: false, error: 'You must be signed in with Google to accept this invitation.' }
    }

    let invitation: NotebookInvitation | null = null
    try {
      const snap = await getDoc(doc(db, 'invitations', inviteId))
      if (snap.exists()) {
        invitation = snap.data() as NotebookInvitation
      }
    } catch (e) {
      console.warn('Error fetching invitation:', e)
    }

    if (!invitation || invitation.status !== 'pending') {
      return {
        success: false,
        error: invitation?.status === 'accepted'
          ? 'This invitation has already been accepted.'
          : 'Invitation is not valid or has been revoked.',
      }
    }

    const now = new Date().toISOString()

    // 1. Mark invitation as accepted
    try {
      await updateDoc(doc(db, 'invitations', inviteId), {
        status: 'accepted',
        accepted_at: now,
        accepted_by: user.id,
        accepted_by_name: user.name || 'User',
        accepted_by_email: user.email || null,
        updated_at: now,
      })
    } catch (e) {
      console.warn('Error updating invitation doc:', e)
    }

    // 2. Fetch notebook and add user.id to member_ids
    let targetNotebook: Notebook | null = null
    try {
      const nbSnap = await getDoc(doc(db, 'notebooks', invitation.notebook_id))
      if (nbSnap.exists()) {
        targetNotebook = nbSnap.data() as Notebook
      }
    } catch (e) {
      console.warn('Error fetching notebook doc:', e)
    }

    if (!targetNotebook) {
      targetNotebook = get().notebooks.find((n) => n.id === invitation!.notebook_id) || null
    }

    if (targetNotebook) {
      const currentMembers = targetNotebook.member_ids || []
      const updatedMembers = Array.from(new Set([...currentMembers, user.id]))
      const updatedPending = (targetNotebook.pending_invites || []).filter(
        (p) => p.id !== inviteId && p.email.toLowerCase() !== (invitation!.invitee_email || '').toLowerCase()
      )

      const updatedNotebook: Notebook = {
        ...targetNotebook,
        member_ids: updatedMembers,
        pending_invites: updatedPending,
        updated_at: now,
      }

      // Update in Firestore
      try {
        await updateDoc(doc(db, 'notebooks', targetNotebook.id), {
          member_ids: updatedMembers,
          pending_invites: updatedPending,
          updated_at: now,
        })
      } catch (e) {
        console.warn('Error updating notebook member_ids in Firestore:', e)
      }

      // Update local state
      const currentNotebooks = get().notebooks
      const existsInState = currentNotebooks.some((n) => n.id === targetNotebook!.id)
      const newNotebooksList = existsInState
        ? currentNotebooks.map((n) => (n.id === targetNotebook!.id ? updatedNotebook : n))
        : [...currentNotebooks, updatedNotebook]

      localDB.setNotebooks(newNotebooksList)
      set({ notebooks: newNotebooksList, activeNotebookId: targetNotebook.id })
      localDB.setActiveNotebookId(targetNotebook.id)

      // Set user's active notebook
      try {
        await updateDoc(doc(db, 'users', user.id), { active_notebook_id: targetNotebook.id })
      } catch (e) {}

      // Cache user directory
      useUserDirectoryStore.getState().fetchUsers([targetNotebook.owner_id, ...updatedMembers])

      toast.success(`You joined "${targetNotebook.name}"!`)
      return { success: true, notebookId: targetNotebook.id }
    }

    return { success: false, error: 'Notebook could not be located.' }
  },

  declineInvitation: async (inviteId: string) => {
    const user = useAuthStore.getState().user
    if (user && !user.is_anonymous) {
      try {
        await updateDoc(doc(db, 'invitations', inviteId), {
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Error declining invitation:', e)
      }
    }
    toast.info('Invitation declined.')
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
