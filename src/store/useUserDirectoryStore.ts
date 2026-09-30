import { create } from 'zustand'
import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from './useAuthStore'

export interface UserProfile {
  id: string
  name: string
  email?: string | null
}

const STORAGE_KEY = 'camoniku_cached_users'

function getInitialCachedUsers(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

interface UserDirectoryState {
  users: Record<string, UserProfile>
  fetchUsers: (userIds: string[]) => Promise<void>
  getUserName: (userId?: string | null, showYou?: boolean) => string
}

export const useUserDirectoryStore = create<UserDirectoryState>((set, get) => ({
  users: getInitialCachedUsers(),

  getUserName: (userId?: string | null, showYou: boolean = false) => {
    if (!userId) return 'User'

    const currentUser = useAuthStore.getState().user
    const isCurrent =
      currentUser &&
      (userId === currentUser.id ||
        userId === 'guest' ||
        (currentUser.is_anonymous && (userId.startsWith('guest') || currentUser.id.startsWith('guest'))))

    if (isCurrent) {
      const name = currentUser.name || (currentUser.is_anonymous ? 'Guest' : 'User')
      return showYou ? `${name} (You)` : name
    }

    // Check cached users
    const cached = get().users[userId]
    if (cached?.name) {
      return cached.name
    }

    // If it's an email address
    if (userId.includes('@')) {
      const prefix = userId.split('@')[0]
      return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }

    // If it's a guest id
    if (userId.startsWith('guest') || userId === 'guest') {
      return 'Guest'
    }

    // If it's a long UID, return 'Collaborator' instead of raw UID gibberish
    return 'Collaborator'
  },

  fetchUsers: async (userIds: string[]) => {
    const currentUser = useAuthStore.getState().user
    const currentUsers = get().users

    const idsToFetch = Array.from(new Set(userIds)).filter(
      (id) =>
        id &&
        id !== 'guest' &&
        !id.startsWith('guest') &&
        !id.includes('@') &&
        id !== currentUser?.id &&
        !currentUsers[id]
    )

    if (idsToFetch.length === 0) return

    const updated = { ...currentUsers }
    let hasNew = false

    for (const id of idsToFetch) {
      try {
        const snap = await getDoc(doc(db, 'users', id))
        if (snap.exists()) {
          const data = snap.data()
          if (data?.name) {
            updated[id] = {
              id,
              name: data.name,
              email: data.email || null,
            }
            hasNew = true
          }
        }
      } catch (e) {
        console.warn(`Could not fetch profile for user ${id}:`, e)
      }
    }

    if (hasNew) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      set({ users: updated })
    }
  },
}))
