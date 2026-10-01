import React, { useState, useEffect } from 'react'
import { useNotebookStore } from '@/store/useNotebookStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useUserDirectoryStore } from '@/store/useUserDirectoryStore'
import { Notebook } from '@/types'
import { NotebookModal } from '@/components/modals/NotebookModal'
import { InviteMemberModal } from '@/components/modals/InviteMemberModal'
import { ManageMetadataModal } from '@/components/modals/ManageMetadataModal'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { EmptyState } from '@/components/common/EmptyState'
import {
  BookOpen,
  Plus,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  Shield,
  Receipt,
  Tags,
  User as UserIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const NotebooksPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { notebooks, activeNotebookId, setActiveNotebookId, deleteNotebook } = useNotebookStore()
  const { transactions } = useTransactionStore()
  const { getUserName, fetchUsers } = useUserDirectoryStore()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null)
  const [managingMembersNotebook, setManagingMembersNotebook] = useState<Notebook | null>(null)
  const [managingMetadataNotebook, setManagingMetadataNotebook] = useState<Notebook | null>(null)
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const ownerIds = notebooks.map((nb) => nb.owner_id).filter(Boolean)
    if (ownerIds.length > 0) {
      fetchUsers(ownerIds)
    }
  }, [notebooks, fetchUsers])

  const handleDeleteConfirm = async () => {
    if (!deletingNotebookId) return
    setIsDeleting(true)
    try {
      await deleteNotebook(deletingNotebookId)
    } finally {
      setIsDeleting(false)
      setDeletingNotebookId(null)
    }
  }

  const isNotebookOwner = (nb: Notebook) => {
    if (!user) return true
    if (user.is_anonymous) return nb.owner_id === 'guest' || nb.owner_id === user.id
    return nb.owner_id === user.id
  }

  const ownedNotebooksCount = notebooks.filter(isNotebookOwner).length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('notebooks.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('notebooks.subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('notebooks.create_notebook')}</span>
        </button>
      </div>

      {/* Notebooks List */}
      {notebooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('notebooks.no_notebooks')}
          description={t('notebooks.no_notebooks_desc')}
          actionLabel={t('notebooks.create_notebook')}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notebooks.map((nb) => {
            const isActive = nb.id === activeNotebookId
            const isOwner = isNotebookOwner(nb)
            const txCount = transactions.filter((t) => t.notebook_id === nb.id).length
            const memberCount = nb.member_ids?.length || 1

            return (
              <div
                key={nb.id}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between shadow-xs ${
                  isActive
                    ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-indigo-100/50'
                    : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          {nb.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {nb.currency}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('notebooks.active')}</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata Stats */}
                  <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-slate-400" />
                      <span>{t('notebooks.transactions_count', { count: txCount })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {t('notebooks.members_count', { count: memberCount })}
                        {nb.pending_invites && nb.pending_invites.length > 0 && (
                          <span className="text-amber-600 font-semibold"> ({nb.pending_invites.length} {t('notebooks.pending')})</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('notebooks.your_role')}</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      {isOwner ? (
                        <>
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{t('notebooks.role_owner')}</span>
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {t('notebooks.role_member')} ({t('notebooks.owner_label')} {getUserName(nb.owner_id)})
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => setActiveNotebookId(nb.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      {t('notebooks.set_active')}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">{t('notebooks.current_workspace')}</span>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    {/* Classifications & Categories */}
                    <button
                      type="button"
                      onClick={() => setManagingMetadataNotebook(nb)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      title={t('notebooks.manage_metadata')}
                    >
                      <Tags className="w-4 h-4" />
                    </button>

                    {/* Invite / Manage Members */}
                    <button
                      type="button"
                      onClick={() => setManagingMembersNotebook(nb)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      title={t('notebooks.manage_members')}
                    >
                      <Users className="w-4 h-4" />
                    </button>

                    {/* Edit Notebook (Owner only) */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setEditingNotebook(nb)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        title={t('notebooks.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete Notebook (Owner only, must keep at least 1 owned notebook) */}
                    {isOwner && ownedNotebooksCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setDeletingNotebookId(nb.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title={t('notebooks.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Notebook Modal */}
      <NotebookModal
        isOpen={isAddModalOpen || !!editingNotebook}
        notebookToEdit={editingNotebook}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingNotebook(null)
        }}
      />

      {/* Invite / Manage Members Modal */}
      <InviteMemberModal
        isOpen={!!managingMembersNotebook}
        notebook={managingMembersNotebook}
        onClose={() => setManagingMembersNotebook(null)}
      />

      {/* Classifications & Categories Modal */}
      <ManageMetadataModal
        isOpen={!!managingMetadataNotebook}
        notebook={managingMetadataNotebook}
        onClose={() => setManagingMetadataNotebook(null)}
      />

      {/* Delete Confirmation Modal (NEVER native window.confirm) */}
      <ConfirmModal
        isOpen={!!deletingNotebookId}
        title={t('modals.confirm_delete_title')}
        message={t('notebooks.delete_warning')}
        confirmText={t('modals.confirm')}
        cancelText={t('modals.cancel')}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingNotebookId(null)}
      />
    </div>
  )
}
