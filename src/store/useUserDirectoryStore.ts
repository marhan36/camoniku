import { create } from 'zustand'
import { db } from '@/lib/firebase/config'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuthStore } from './useAuthStore'
import i18n from '@/i18n'

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

// Track active real-time listeners for collaborator profiles
const activeListeners = new Map<string, () => void>()

interface UserDirectoryState {
  users: Record<string, UserProfile>
  fetchUsers: (userIds: string[]) => void
  setUserProfile: (id: string, profile: UserProfile) => void
  getUserName: (
    userId?: string | null,
    showYou?: boolean,
    fallbackName?: string | null
  ) => string
  clearUsers: () => void
}

export const useUserDirectoryStore = create<UserDirectoryState>((set, get) => ({
  users: getInitialCachedUsers(),

  setUserProfile: (id: string, profile: UserProfile) => {
    const current = get().users
    const updated = { ...current, [id]: profile }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    set({ users: updated })
  },

  getUserName: (
    userId?: string | null,
    showYou: boolean = false,
    fallbackName?: string | null
  ) => {
    if (!userId) return fallbackName || i18n.t('common.user', 'User')

    const currentUser = useAuthStore.getState().user
    const isCurrent =
      currentUser &&
      (userId === currentUser.id ||
        userId === 'guest' ||
        (currentUser.is_anonymous && (userId.startsWith('guest') || currentUser.id.startsWith('guest'))))

    if (isCurrent) {
      const name = currentUser.name || (currentUser.is_anonymous ? i18n.t('common.guest', 'Guest') : i18n.t('common.user', 'User'))
      return showYou ? `${name} (${i18n.t('common.you', 'You')})` : name
    }

    // Check cached/live users directory first (always latest profile name)
    const cached = get().users[userId]
    if (cached?.name) {
      return cached.name
    }

    // If fallbackName is available and not a raw hash
    if (fallbackName && fallbackName !== userId && !fallbackName.startsWith('guest_') && fallbackName.length < 32) {
      return fallbackName
    }

    // If it's an email address
    if (userId.includes('@')) {
      const prefix = userId.split('@')[0]
      return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }

    // If it's a guest id
    if (userId.startsWith('guest') || userId === 'guest') {
      return i18n.t('common.guest', 'Guest')
    }

    // Return Collaborator fallback instead of raw UID gibberish
    return i18n.t('common.collaborator', 'Collaborator')
  },

  fetchUsers: (userIds: string[]) => {
    const currentUser = useAuthStore.getState().user

    const idsToListen = Array.from(new Set(userIds)).filter(
      (id) =>
        id &&
        id !== 'guest' &&
        !id.startsWith('guest') &&
        !id.includes('@') &&
        id !== currentUser?.id
    )

    if (idsToListen.length === 0) return

    for (const id of idsToListen) {
      if (activeListeners.has(id)) continue

      try {
        const unsub = onSnapshot(
          doc(db, 'users', id),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data()
              if (data?.name) {
                const profile: UserProfile = {
                  id,
                  name: data.name,
                  email: data.email || null,
                }
                const current = get().users
                // Only update state if name or email changed
                if (current[id]?.name !== profile.name || current[id]?.email !== profile.email) {
                  const updated = { ...current, [id]: profile }
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
                  } catch {}
                  set({ users: updated })
                }
              }
            }
          },
          (err) => {
            console.warn(`Real-time user directory listener error for ${id}:`, err)
          }
        )
        activeListeners.set(id, unsub)
      } catch (e) {
        console.warn(`Could not attach listener for user ${id}:`, e)
      }
    }
  },

  clearUsers: () => {
    activeListeners.forEach((unsub) => {
      try {
        unsub()
      } catch {}
    })
    activeListeners.clear()
    localStorage.removeItem(STORAGE_KEY)
    set({ users: {} })
  },
}))
