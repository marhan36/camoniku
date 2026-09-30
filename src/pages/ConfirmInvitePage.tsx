import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { NotebookInvitation } from '@/types'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotebookStore } from '@/store/useNotebookStore'
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  User,
  ArrowRight,
  Shield,
  XCircle,
} from 'lucide-react'

export const ConfirmInvitePage: React.FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>()
  const navigate = useNavigate()
  const { user, loginWithGoogle, isLoading: isAuthLoading } = useAuthStore()
  const { acceptInvitation, declineInvitation } = useNotebookStore()

  const [invitation, setInvitation] = useState<NotebookInvitation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInvite() {
      if (!inviteId) {
        setError('No invitation ID provided.')
        setIsLoading(false)
        return
      }

      try {
        const snap = await getDoc(doc(db, 'invitations', inviteId))
        if (!snap.exists()) {
          setError('This invitation link is invalid or has expired.')
        } else {
          const data = snap.data() as NotebookInvitation
          setInvitation(data)
        }
      } catch (err: any) {
        console.warn('Error loading invitation:', err)
        setError('Unable to load invitation details. Please check your network connection.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInvite()
  }, [inviteId])

  const handleAccept = async () => {
    if (!inviteId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await acceptInvitation(inviteId)
      if (res.success) {
        navigate('/')
      } else {
        setError(res.error || 'Failed to accept invitation.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecline = async () => {
    if (!inviteId) return
    setIsSubmitting(true)
    try {
      await declineInvitation(inviteId)
      navigate('/')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-md w-full text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading invitation details...</p>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invitation Unavailable</h2>
            <p className="text-xs text-slate-500 mt-1">{error || 'This invitation does not exist or has expired.'}</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <span>Back to Camoniku</span>
          </Link>
        </div>
      </div>
    )
  }

  // If already accepted
  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Already Accepted</h2>
            <p className="text-xs text-slate-500 mt-1">
              You or another member have already accepted this invitation for <strong>{invitation.notebook_name}</strong>.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <span>Open Notebook</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // If revoked or declined
  if (invitation.status === 'revoked' || invitation.status === 'declined') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invitation Expired</h2>
            <p className="text-xs text-slate-500 mt-1">
              This invitation has been {invitation.status} by the owner.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  const isGuestOrLoggedOut = !user || user.is_anonymous
  const isEmailMismatch =
    user && !user.is_anonymous && user.email && user.email.toLowerCase() !== invitation.invitee_email.toLowerCase()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg max-w-lg w-full p-6 sm:p-8 space-y-6">
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Notebook Invitation</h1>
              <p className="text-xs text-slate-400">Collaboration on Camoniku</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            Pending Confirmation
          </span>
        </div>

        {/* Notebook Preview Card */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl p-5 border border-indigo-100/60 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-white text-indigo-600 rounded-xl shadow-xs shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                Shared Notebook
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 truncate">
                {invitation.notebook_name}
              </h2>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                {invitation.currency || 'IDR'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-indigo-100/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">Invited by:</span>
                <span className="font-semibold text-slate-800">{invitation.owner_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">Intended for:</span>
                <span className="font-medium text-slate-800">{invitation.invitee_email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth / Action Section */}
        {isGuestOrLoggedOut ? (
          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sign in to Accept Invitation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please sign in with Google ({invitation.invitee_email}) to add this shared notebook to your account.
              </p>
            </div>
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={isAuthLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAuthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign in with Google</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {isEmailMismatch && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  You are currently logged in as <strong>{user?.email}</strong>. This invitation was sent to{' '}
                  <strong>{invitation.invitee_email}</strong>. You may still accept it to attach this notebook to your current account.
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept & Join Notebook</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDecline}
                disabled={isSubmitting}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
