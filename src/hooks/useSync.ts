import { useEffect, useState, useCallback } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useNetworkStore } from '@/store/useNetworkStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { Notebook, Classification, Category, Transaction } from '@/types'
import { toast } from 'sonner'
import i18n from '@/i18n'

export function useSync() {
  const { user } = useAuthStore()
  const { activeNotebookId, setNotebooks } = useNotebookStore()
  const { syncNotebookClassifications, syncNotebookCategories, ensureNotebookMetadata } = useMetadataStore()
  const { setTransactions } = useTransactionStore()
  const { setOnline, setSyncStatus } = useNetworkStore()
  const [retryTrigger, setRetryTrigger] = useState(0)

  // 1. Online / Offline & Visibility window listeners
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      if (user?.is_anonymous) {
        setSyncStatus('local_only')
      } else {
        setSyncStatus('syncing')
        setRetryTrigger((c) => c + 1)
      }
    }
    const handleOffline = () => {
      setOnline(false)
      setSyncStatus('offline')
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && user && !user.is_anonymous) {
        setRetryTrigger((c) => c + 1)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, setOnline, setSyncStatus])

  // 2. Real-time Firebase Sync for authenticated (non-anonymous) users
  useEffect(() => {
    if (!user || user.is_anonymous || !auth.currentUser) {
      if (!user || user.is_anonymous) {
        setSyncStatus('local_only')
      }
      return
    }

    setSyncStatus('syncing')
    const currentUid = auth.currentUser.uid

    // Listen to user's notebooks
    const notebooksRef = collection(db, 'notebooks')
    const qNotebooks = query(notebooksRef, where('member_ids', 'array-contains', currentUid))

    let retryTimer: ReturnType<typeof setTimeout> | null = null

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
        } else {
          setNotebooks([])
        }
        setSyncStatus('synced')
      },
      (err) => {
        console.warn('Notebooks sync warning:', err)
        if (!navigator.onLine) {
          setSyncStatus('offline')
        } else {
          setSyncStatus('syncing')
          retryTimer = setTimeout(() => {
            if (navigator.onLine) setRetryTrigger((c) => c + 1)
          }, 3000)
        }
      }
    )

    // Listen to accepted invitations for owner's notebooks to ensure member_ids are synced
    const invRef = collection(db, 'invitations')
    const qAcceptedInv = query(
      invRef,
      where('owner_id', '==', currentUid),
      where('status', '==', 'accepted')
    )
    const unsubInv = onSnapshot(
      qAcceptedInv,
      async (snapshot) => {
        const { notebooks: currentNotebooks, updateNotebook } = useNotebookStore.getState()
        for (const docSnap of snapshot.docs) {
          const inv = docSnap.data()
          if (!inv.accepted_by) continue
          const nb = currentNotebooks.find((n) => n.id === inv.notebook_id)
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
      if (retryTimer) clearTimeout(retryTimer)
      unsubNotebooks()
      unsubInv()
    }
  }, [user?.id, setNotebooks, setSyncStatus, retryTrigger])

  // 3. Listen to Classifications, Categories, Transactions for the Active Notebook
  useEffect(() => {
    if (!user || user.is_anonymous || !auth.currentUser || !activeNotebookId) {
      return
    }

    // Safety guard: only listen to Firestore if active notebook exists in verified notebooks
    const currentNotebook = useNotebookStore.getState().notebooks.find((n) => n.id === activeNotebookId)
    if (!currentNotebook) {
      return
    }

    setSyncStatus('syncing')
    let retryTimer: ReturnType<typeof setTimeout> | null = null

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
        } else if (!snapshot.metadata.fromCache) {
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
        } else if (!snapshot.metadata.fromCache) {
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
        if (!navigator.onLine) {
          setSyncStatus('offline')
        } else {
          setSyncStatus('syncing')
          retryTimer = setTimeout(() => {
            if (navigator.onLine) setRetryTrigger((c) => c + 1)
          }, 3000)
        }
      }
    )

    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      unsubClass()
      unsubCat()
      unsubTx()
    }
  }, [
    user?.id,
    activeNotebookId,
    syncNotebookClassifications,
    syncNotebookCategories,
    ensureNotebookMetadata,
    setTransactions,
    setSyncStatus,
    retryTrigger,
  ])

  // 4. Manual sync handler
  const handleManualSync = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline')
      toast.error(i18n.t('sync.offline_desc', 'Device is offline'))
      return
    }

    if (!user || user.is_anonymous || !auth.currentUser) {
      toast.info(i18n.t('sync.guest_mode_desc', 'Guest Mode: Data stored locally on this device'))
      return
    }

    try {
      setSyncStatus('syncing')
      const currentUid = auth.currentUser.uid

      // 1. Re-fetch user's notebooks
      const notebooksRef = collection(db, 'notebooks')
      const qNotebooks = query(notebooksRef, where('member_ids', 'array-contains', currentUid))
      const nbSnapshot = await getDocs(qNotebooks)
      const loadedNotebooks: Notebook[] = []
      nbSnapshot.forEach((docSnap) => {
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
      } else {
        setNotebooks([])
      }

      // 2. If active notebook exists, re-fetch its metadata and transactions
      const curActiveId = useNotebookStore.getState().activeNotebookId
      if (curActiveId) {
        const classRef = collection(db, 'classifications')
        const qClass = query(classRef, where('notebook_id', '==', curActiveId))
        const classSnap = await getDocs(qClass)
        const classItems: Classification[] = []
        classSnap.forEach((d) => classItems.push(d.data() as Classification))
        if (classItems.length > 0) {
          syncNotebookClassifications(curActiveId, classItems)
        } else {
          await ensureNotebookMetadata(curActiveId)
        }

        const catRef = collection(db, 'categories')
        const qCat = query(catRef, where('notebook_id', '==', curActiveId))
        const catSnap = await getDocs(qCat)
        const catItems: Category[] = []
        catSnap.forEach((d) => catItems.push(d.data() as Category))
        if (catItems.length > 0) {
          syncNotebookCategories(curActiveId, catItems)
        } else {
          await ensureNotebookMetadata(curActiveId)
        }

        const txRef = collection(db, 'transactions')
        const qTx = query(txRef, where('notebook_id', '==', curActiveId))
        const txSnap = await getDocs(qTx)
        const txItems: Transaction[] = []
        txSnap.forEach((d) => txItems.push(d.data() as Transaction))
        setTransactions(txItems)
        const txAuthors = txItems.map((t) => t.user_id).filter(Boolean)
        useUserDirectoryStore.getState().fetchUsers(txAuthors)
      }

      setRetryTrigger((c) => c + 1)
      setSyncStatus('synced')
      toast.success(i18n.t('sync.sync_success', 'Data synchronized with cloud'))
    } catch (err: unknown) {
      console.error('Manual sync error:', err)
      setSyncStatus(navigator.onLine ? 'synced' : 'offline')
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`${i18n.t('sync.sync_failed', 'Failed to sync with cloud')}: ${msg}`)
    }
  }, [
    user,
    setNotebooks,
    setTransactions,
    syncNotebookClassifications,
    syncNotebookCategories,
    ensureNotebookMetadata,
    setSyncStatus,
  ])

  useEffect(() => {
    useNetworkStore.getState().setManualSyncFn(handleManualSync)
    return () => {
      useNetworkStore.getState().setManualSyncFn(null)
    }
  }, [handleManualSync])
}
