import React, { useState, useEffect } from 'react'
import { Notebook } from '@/types'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import {
  X,
  Users,
  Mail,
  Trash2,
  Shield,
  User as UserIcon,
  Copy,
  Check,
  ExternalLink,
  Send,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
  const { notebooks, inviteMemberByEmail, revokeInvitation, removeMember } = useNotebookStore()
  const { getUserName, fetchUsers, users } = useUserDirectoryStore()

  const [emailInput, setEmailInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Use live notebook from store so pending invites and member changes update reactively
  const liveNotebook = notebooks.find((n) => n.id === notebook?.id) || notebook

  useEffect(() => {
    if (isOpen && liveNotebook) {
      const ids = [liveNotebook.owner_id, ...(liveNotebook.member_ids || [])]
      fetchUsers(ids)
    }
  }, [isOpen, liveNotebook, fetchUsers])

  if (!isOpen || !liveNotebook) return null

  const isOwner = user?.id === liveNotebook.owner_id || (!user && true) // Guest owner locally
  const isGuest = user?.is_anonymous

  const getConfirmationUrl = (inviteId: string) => {
    const baseUrl = window.location.href.split('#')[0].replace(/\/+$/, '')
    return `${baseUrl}/#/invite/${inviteId}`
  }

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      toast.success('Invitation link copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      toast.error('Failed to copy link.')
    }
  }

  const handleOpenMailto = (targetEmail: string, inviteUrl: string) => {
    const subject = encodeURIComponent(`Invitation to collaborate on "${liveNotebook.name}" - Camoniku`)
    const body = encodeURIComponent(
      `Hello,\n\nI have invited you to collaborate on the shared notebook "${liveNotebook.name}" on Camoniku.\n\nClick the link below to confirm and join:\n${inviteUrl}\n\nPlease sign in with ${targetEmail} to accept.\n\nBest regards,\n${user?.name || 'Camoniku User'}`
    )
    window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`, '_blank')
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = emailInput.trim()
    if (!targetEmail) return

    setIsSubmitting(true)
    try {
      const res = await inviteMemberByEmail(liveNotebook.id, targetEmail)
      if (res.success) {
        setEmailInput('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    try {
      await removeMember(liveNotebook.id, memberToRemove)
    } finally {
      setMemberToRemove(null)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    await revokeInvitation(liveNotebook.id, inviteId)
  }

  const pendingInvites = liveNotebook.pending_invites || []

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 sm:p-7 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('notebooks.manage_members')}</h2>
                <p className="text-xs text-slate-500">{liveNotebook.name}</p>
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

          <div className="overflow-y-auto flex-1 pr-1 space-y-5 my-3">
            {/* Invite Form */}
            {isGuest ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Guest Account</p>
                  <p className="mt-0.5 text-amber-700">
                    You are using an offline guest profile. Please link a Google account in Settings to invite collaborators via email.
                  </p>
                </div>
              </div>
            ) : isOwner ? (
              <form onSubmit={handleInvite} className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Invite Member by Email
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="colleague@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !emailInput.trim()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending...' : 'Send Invite'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  An email confirmation link will be sent to the invitee. They will join after confirming.
                </p>
              </form>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                Only the notebook owner ({getUserName(liveNotebook.owner_id)}) can invite or remove collaborators.
              </div>
            )}
            {/* Current Active Members */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                <span>Active Members</span>
                <span className="text-[11px] font-medium text-slate-400">
                  {liveNotebook.member_ids?.length || 1}
                </span>
              </h4>

              <div className="space-y-2">
                {liveNotebook.member_ids.map((memberId) => {
                  const isMemberOwner = memberId === liveNotebook.owner_id
                  const isCurrentUser = memberId === user?.id
                  const cachedUser = users[memberId]
                  const emailDisplay = cachedUser?.email || (memberId.includes('@') ? memberId : null)

                  return (
                    <div
                      key={memberId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {getUserName(memberId, isCurrentUser)}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                            {isMemberOwner ? (
                              <span className="inline-flex items-center gap-1 text-indigo-600 font-bold">
                                <Shield className="w-3 h-3" /> Owner
                              </span>
                            ) : (
                              <span>Collaborator</span>
                            )}
                            {emailDisplay && (
                              <>
                                <span>•</span>
                                <span className="truncate">{emailDisplay}</span>
                              </>
                            )}
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

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending Confirmation</span>
                  </span>
                  <span className="text-[11px] font-medium text-amber-600">
                    {pendingInvites.length}
                  </span>
                </h4>

                <div className="space-y-2">
                  {pendingInvites.map((invite) => {
                    const inviteUrl = getConfirmationUrl(invite.id)

                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {invite.email}
                            </p>
                            <span className="inline-block text-[10px] text-amber-700 font-medium">
                              Waiting for invitee to confirm
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inviteUrl, invite.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer"
                            title="Copy Confirmation Link"
                          >
                            {copiedId === invite.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMailto(invite.email, inviteUrl)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer"
                            title="Send via Email Client"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(invite.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Cancel / Revoke Invitation"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
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
        message={`Are you sure you want to remove this member from the notebook? They will lose access to its transactions.`}
        confirmText="Remove"
        onConfirm={handleConfirmRemove}
        onCancel={() => setMemberToRemove(null)}
      />
    </>
  )
}
