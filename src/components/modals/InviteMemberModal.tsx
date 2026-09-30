import React, { useState, useEffect } from 'react'
import { Notebook } from '@/types'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { X, Users, UserPlus, Trash2, Shield, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface InviteMemberModalProps {
  isOpen: boolean
  notebook: Notebook | null
  onClose: () => void
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  notebook,
  onClose,
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { inviteMember, removeMember } = useNotebookStore()
  const { getUserName, fetchUsers } = useUserDirectoryStore()

  const [memberInput, setMemberInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && notebook) {
      const ids = [notebook.owner_id, ...(notebook.member_ids || [])]
      fetchUsers(ids)
    }
  }, [isOpen, notebook, fetchUsers])

  if (!isOpen || !notebook) return null

  const isOwner = user?.id === notebook.owner_id || !user // Guest is local owner

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberInput.trim()) return

    setIsSubmitting(true)
    try {
      const ok = await inviteMember(notebook.id, memberInput.trim())
      if (ok) {
        setMemberInput('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    try {
      await removeMember(notebook.id, memberToRemove)
    } finally {
      setMemberToRemove(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('notebooks.manage_members')}</h2>
                <p className="text-xs text-slate-500">{notebook.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Invite input (only if owner) */}
          {isOwner ? (
            <form onSubmit={handleInvite} className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('modals.invite_member_title')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('modals.invite_input_placeholder')}
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !memberInput.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('modals.invite_btn')}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
              Only the notebook owner ({getUserName(notebook.owner_id)}) can invite or remove collaborators.
            </div>
          )}

          {/* Members List */}
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Current Members ({notebook.member_ids?.length || 1})
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {notebook.member_ids.map((memberId) => {
                const isMemberOwner = memberId === notebook.owner_id
                const isCurrentUser = memberId === user?.id

                return (
                  <div
                    key={memberId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {getUserName(memberId, isCurrentUser)}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {isMemberOwner ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                              <Shield className="w-3 h-3" /> Owner
                            </span>
                          ) : (
                            'Collaborator'
                          )}
                          {memberId.includes('@') && ` • ${memberId}`}
                        </p>
                      </div>
                    </div>

                    {isOwner && !isMemberOwner && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(memberId)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Global Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        title="Remove Collaborator"
        message={`Are you sure you want to remove member "${memberToRemove}" from this notebook? They will lose access to its transactions.`}
        confirmText="Remove"
        onConfirm={handleConfirmRemove}
        onCancel={() => setMemberToRemove(null)}
      />
    </>
  )
}
