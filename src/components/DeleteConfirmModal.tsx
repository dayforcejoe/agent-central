import { AlertTriangle, X } from 'lucide-react'
import type { Agent } from '../types/agent'

interface DeleteConfirmModalProps {
  agent: Agent
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({ agent, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-red-600" size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Delete Agent</h2>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{agent.name}</strong>?
                This action cannot be undone and will remove all associated configuration and history.
              </p>
            </div>
          </div>

          {agent.source === 'dayforce' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              This is a Dayforce-managed agent. Deleting it will only remove it from your registry view — it can be re-added from the Dayforce catalog.
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            Delete Agent
          </button>
        </div>

        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
