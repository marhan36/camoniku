import React, { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { NotebookInvitation } from '@/types'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import { Mail, Check, X, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const PendingInvitationsBanner: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { acceptInvitation, declineInvitation } = useNotebookStore()
  const [invitations, setInvitations] = useState<NotebookInvitation[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.is_anonymous || !user.email) {
      setInvitations([])
      return
    }

    const email = user.email.toLowerCase()
    const q = query(
      collection(db, 'invitations'),
      where('invitee_email', '==', email),
      where('status', '==', 'pending')
    )

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: NotebookInvitation[] = []
        snapshot.forEach((d) => list.push(d.data() as NotebookInvitation))
        setInvitations(list)
      },
      (err) => {
        console.warn('Pending invitations listener warning:', err)
      }
    )

    return () => unsub()
  }, [user])

  if (invitations.length === 0) return null

  const handleAccept = async (inviteId: string) => {
    setProcessingId(inviteId)
    try {
      await acceptInvitation(inviteId)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId)
    try {
      await declineInvitation(inviteId)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-2 mb-6">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-indigo-50 via-white to-indigo-50/50 rounded-2xl border border-indigo-200/80 shadow-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                <span>{t('invitations.banner_from')} </span>
                <span className="text-indigo-600 font-bold">{inv.owner_name}</span>
                <span> {t('invitations.banner_to_collaborate')} </span>
                <span className="underline decoration-indigo-300 font-bold">{inv.notebook_name}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {t('invitations.banner_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleAccept(inv.id)}
              disabled={processingId === inv.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              {processingId === inv.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{t('invitations.accept_and_join')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDecline(inv.id)}
              disabled={processingId === inv.id}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-xl border border-slate-200 transition disabled:opacity-50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('invitations.decline')}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
