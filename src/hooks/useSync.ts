import { useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useNetworkStore } from '@/store/useNetworkStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { Notebook, Classification, Category, Transaction } from '@/types'

export function useSync() {
  const { user } = useAuthStore()
  const { activeNotebookId, setNotebooks } = useNotebookStore()
  const { syncNotebookClassifications, syncNotebookCategories, ensureNotebookMetadata } = useMetadataStore()
  const { setTransactions } = useTransactionStore()
  const { setOnline, setSyncStatus } = useNetworkStore()

  // 1. Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      if (user?.is_anonymous) {
        setSyncStatus('local_only')
      } else {
        setSyncStatus('synced')
      }
    }
    const handleOffline = () => {
      setOnline(false)
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, setOnline, setSyncStatus])

  // 2. Real-time Firebase Sync for authenticated (non-anonymous) users
  useEffect(() => {
    if (!user || user.is_anonymous) {
      setSyncStatus('local_only')
      return
    }

    setSyncStatus('syncing')

    // Listen to user's notebooks
    const notebooksRef = collection(db, 'notebooks')
    const qNotebooks = query(notebooksRef, where('member_ids', 'array-contains', user.id))

    const unsubNotebooks = onSnapshot(
      qNotebooks,
      (snapshot) => {
        const loadedNotebooks: Notebook[] = []
        snapshot.forEach((docSnap) => {
          loadedNotebooks.push(docSnap.data() as Notebook)
        })
        if (loadedNotebooks.length > 0) {
          setNotebooks(loadedNotebooks)
          const allUserIds: string[] = []
          loadedNotebooks.forEach((nb) => {
            if (nb.owner_id) allUserIds.push(nb.owner_id)
            if (nb.member_ids) allUserIds.push(...nb.member_ids)
          })
          useUserDirectoryStore.getState().fetchUsers(allUserIds)
        }
        setSyncStatus('synced')
      },
      (err) => {
        console.warn('Notebooks sync warning:', err)
        setSyncStatus('offline')
      }
    )

    // Listen to accepted invitations for owner's notebooks to ensure member_ids are synced
    const invRef = collection(db, 'invitations')
    const qAcceptedInv = query(
      invRef,
      where('owner_id', '==', user.id),
      where('status', '==', 'accepted')
    )
    const unsubInv = onSnapshot(
      qAcceptedInv,
      async (snapshot) => {
        const { notebooks, updateNotebook } = useNotebookStore.getState()
        for (const docSnap of snapshot.docs) {
          const inv = docSnap.data()
          if (!inv.accepted_by) continue
          const nb = notebooks.find((n) => n.id === inv.notebook_id)
          if (
            nb &&
            (!nb.member_ids.includes(inv.accepted_by) ||
              nb.pending_invites?.some((p) => p.id === inv.id))
          ) {
            const updatedMembers = Array.from(new Set([...nb.member_ids, inv.accepted_by]))
            const updatedPending = (nb.pending_invites || []).filter((p) => p.id !== inv.id)
            await updateNotebook(nb.id, {
              member_ids: updatedMembers,
              pending_invites: updatedPending,
            })
          }
        }
      },
      (err) => console.warn('Accepted invitations listener error:', err)
    )

    return () => {
      unsubNotebooks()
      unsubInv()
    }
  }, [user, setNotebooks, setSyncStatus])

  // 3. Listen to Classifications, Categories, Transactions for the Active Notebook
  useEffect(() => {
    if (!user || user.is_anonymous || !activeNotebookId) {
      return
    }

    setSyncStatus('syncing')

    // Classifications
    const classRef = collection(db, 'classifications')
    const qClass = query(classRef, where('notebook_id', '==', activeNotebookId))
    const unsubClass = onSnapshot(
      qClass,
      async (snapshot) => {
        const items: Classification[] = []
        snapshot.forEach((d) => items.push(d.data() as Classification))
        if (items.length > 0) {
          syncNotebookClassifications(activeNotebookId, items)
        } else {
          await ensureNotebookMetadata(activeNotebookId)
        }
      },
      (e) => console.warn('Classifications sync error:', e)
    )

    // Categories
    const catRef = collection(db, 'categories')
    const qCat = query(catRef, where('notebook_id', '==', activeNotebookId))
    const unsubCat = onSnapshot(
      qCat,
      async (snapshot) => {
        const items: Category[] = []
        snapshot.forEach((d) => items.push(d.data() as Category))
        if (items.length > 0) {
          syncNotebookCategories(activeNotebookId, items)
        } else {
          await ensureNotebookMetadata(activeNotebookId)
        }
      },
      (e) => console.warn('Categories sync error:', e)
    )

    // Transactions
    const txRef = collection(db, 'transactions')
    const qTx = query(txRef, where('notebook_id', '==', activeNotebookId))
    const unsubTx = onSnapshot(
      qTx,
      (snapshot) => {
        const items: Transaction[] = []
        snapshot.forEach((d) => items.push(d.data() as Transaction))
        setTransactions(items)
        setSyncStatus('synced')
        const txAuthors = items.map((t) => t.user_id).filter(Boolean)
        useUserDirectoryStore.getState().fetchUsers(txAuthors)
      },
      (e) => {
        console.warn('Transactions sync error:', e)
        setSyncStatus('offline')
      }
    )

    return () => {
      unsubClass()
      unsubCat()
      unsubTx()
    }
  }, [
    user,
    activeNotebookId,
    syncNotebookClassifications,
    syncNotebookCategories,
    ensureNotebookMetadata,
    setTransactions,
    setSyncStatus,
  ])
}
