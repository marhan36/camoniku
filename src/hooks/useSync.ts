import { useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useMetadataStore } from '@/store/useMetadataStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useNetworkStore } from '@/store/useNetworkStore'
import { Notebook, Classification, Category, Transaction } from '@/types'

export function useSync() {
  const { user } = useAuthStore()
  const { activeNotebookId, setNotebooks } = useNotebookStore()
  const { setClassifications, setCategories } = useMetadataStore()
  const { setTransactions } = useTransactionStore()
  const { setOnline, setSyncStatus } = useNetworkStore()

  // 1. Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
    }
    const handleOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  // 2. Real-time Firebase Sync for authenticated (non-anonymous) users
  useEffect(() => {
    if (!user || user.is_anonymous) {
      setSyncStatus('synced')
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
        }
        setSyncStatus('synced')
      },
      (err) => {
        console.warn('Notebooks sync warning:', err)
        setSyncStatus('offline')
      }
    )

    return () => {
      unsubNotebooks()
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
      (snapshot) => {
        const items: Classification[] = []
        snapshot.forEach((d) => items.push(d.data() as Classification))
        if (items.length > 0) setClassifications(items)
      },
      (e) => console.warn('Classifications sync error:', e)
    )

    // Categories
    const catRef = collection(db, 'categories')
    const qCat = query(catRef, where('notebook_id', '==', activeNotebookId))
    const unsubCat = onSnapshot(
      qCat,
      (snapshot) => {
        const items: Category[] = []
        snapshot.forEach((d) => items.push(d.data() as Category))
        if (items.length > 0) setCategories(items)
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
  }, [user, activeNotebookId, setClassifications, setCategories, setTransactions, setSyncStatus])
}
