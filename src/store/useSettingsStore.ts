import { create } from 'zustand'
import { UserSettings } from '@/types'
import { localDB } from '@/lib/storage/localStorage'
import i18n from '@/i18n'

interface SettingsState extends UserSettings {
  setLanguage: (lang: 'en' | 'id') => void
  setDateFormat: (format: UserSettings['dateFormat']) => void
}

const initialSettings = localDB.getSettings()

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initialSettings,

  setLanguage: (language) => {
    i18n.changeLanguage(language)
    set((state) => {
      const updated = { ...state, language }
      localDB.setSettings(updated)
      return { language }
    })
  },

  setDateFormat: (dateFormat) => {
    set((state) => {
      const updated = { ...state, dateFormat }
      localDB.setSettings(updated)
      return { dateFormat }
    })
  },
}))
