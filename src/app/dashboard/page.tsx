'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import ScriptModal from '@/components/ScriptModal'
import ScriptList  from '@/components/ScriptList'

interface Script {
  id: string; name: string; description: string
  version: number; isActive: boolean; obfuscationLevel: string
  accessToken: string; createdAt: string; updatedAt: string
  metadata: Record<string, any>
}

export default function Dashboard() {
  const [scripts, setScripts]         = useState<Script[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editingScript, setEditing]   = useState<Script|null>(null)

  const fetchScripts = useCallback(async () => {
    try {
      const res  = await fetch('/api/scripts')
      const data = await res.json()
      setScripts(data.scripts || [])
    } catch { toast.error('Failed to load scripts') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this script permanently?')) return
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Script deleted'); fetchScripts() }
    } catch { toast.error('Failed to delete') }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ isActive: !current }),
      })
      if (res.ok) {
        toast.success(`Script ${!current ? 'activated' : 'deactivated'}`)
        fetchScripts()
      }
    } catch { toast.error('Failed to update') }
  }

  const total  = scripts.length
  const active = scripts.filter(s => s.isActive).length

  return (
    <div className="min-h-screen bg-dark-900">
      <nav className="bg-dark-800 border-b border-purple-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">TamperMonkey Admin</span>
            <span className="text-xs text-gray-500 hidden md:block">tamperapp.vercel.app</span>
          </div>
          <button onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 transition-colors text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Scripts',  value: total,           color: 'border-purple-900', text: 'text-white' },
            { label: 'Active',         value: active,          color: 'border-green-900',  text: 'text-green-400' },
            { label: 'Inactive',       value: total - active,  color: 'border-gray-800',   text: 'text-gray-400' },
            { label: 'Security',       value: 'TOTP+OBF',      color: 'border-purple-900', text: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className={`bg-dark-700 rounded-xl p-4 border ${s.color}`}>
              <p className="text-gray-400 text-xs uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Your Scripts</h2>
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 glow-purple">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Script
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
          </div>
        ) : (
          <ScriptList
            scripts={scripts}
            onEdit={s => { setEditing(s); setShowModal(true) }}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onRefresh={fetchScripts}
          />
        )}
      </div>

      {showModal && (
        <ScriptModal
          script={editingScript}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={() => { setShowModal(false); setEditing(null); fetchScripts() }}
        />
      )}
    </div>
  )
}