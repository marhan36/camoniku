import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface MultiSelectOption {
  id: string
  name: string
}

interface MultiSelectDropdownProps {
  label?: string
  placeholder: string
  options: MultiSelectOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  className = '',
}) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const handleSelectAll = () => {
    onChange(options.map((o) => o.id))
  }

  const handleClear = () => {
    onChange([])
  }

  const getDisplayText = () => {
    if (selectedIds.length === 0) return placeholder
    if (selectedIds.length === 1) {
      const match = options.find((o) => o.id === selectedIds[0])
      return match?.name || placeholder
    }
    return t('transactions.selected_count', { count: selectedIds.length })
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border transition-all text-left bg-white ${
          selectedIds.length > 0
            ? 'border-indigo-300 ring-2 ring-indigo-50 font-semibold text-indigo-700'
            : 'border-slate-200 text-slate-600 font-medium hover:border-slate-300'
        }`}
      >
        <span className="truncate">{getDisplayText()}</span>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedIds.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  handleClear()
                }
              }}
              className="p-0.5 rounded-full hover:bg-indigo-100 text-indigo-500 hover:text-indigo-800 transition cursor-pointer"
              title={t('transactions.clear_selection')}
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 min-w-[200px] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {t('transactions.select_all')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={selectedIds.length === 0}
              className="text-slate-400 hover:text-slate-600 font-medium disabled:opacity-40 cursor-pointer"
            >
              {t('transactions.clear_selection')}
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {options.length === 0 ? (
              <p className="text-center py-3 text-xs text-slate-400">No options</p>
            ) : (
              options.map((option) => {
                const isSelected = selectedIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(option.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{option.name}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
