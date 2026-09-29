'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface Script {
  id: string; name: string; description: string
  version: number; isActive: boolean; obfuscationLevel: string
  accessToken: string; createdAt: string; updatedAt: string
  metadata: Record<string, any>
}

interface Props {
  scripts: Script[]
  onEdit: (s: Script) => void
  onDelete: (id: string) => void
  onToggle: (id: string, current: boolean) => void
  onRefresh: () => void
}

const LEVEL_COLORS: Record<string,string> = {
  low    : 'text-green-400 bg-green-900/50',
  medium : 'text-yellow-400 bg-yellow-900/50',
  high   : 'text-orange-400 bg-orange-900/50',
  maximum: 'text-red-400 bg-red-900/50',
}

export default function ScriptList({ scripts, onEdit, onDelete, onToggle }: Props) {
  const [copied, setCopied]       = useState<string|null>(null)
  const [viewing, setViewing]     = useState<string|null>(null)
  const [viewContent, setContent] = useState('')

  async function copyUrl(script: Script) {
    const url = `${window.location.origin}/api/scripts/${script.id}/serve`
    await navigator.clipboard.writeText(url)
    setCopied(script.id)
    toast.success('Install URL copied!')
    setTimeout(() => setCopied(null), 2000)
  }

  async function viewScript(id: string) {
    try {
      const res  = await fetch(`/api/scripts/${id}?view=final`)
      const data = await res.json()
      setContent(data.finalScript || '')
      setViewing(id)
    } catch { toast.error('Failed to load') }
  }

  if (scripts.length === 0) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <p className="text-gray-500 text-lg">No scripts yet</p>
      <p className="text-gray-600 text-sm mt-1">Click "New Script" to create one</p>
    </div>
  )

  return (
    <>
      <div className="grid gap-4">
        {scripts.map(s => (
          <div key={s.id}
            className={`bg-dark-700 rounded-xl p-5 border transition-all ${s.isActive ? 'border-purple-900 hover:border-purple-700' : 'border-gray-800 opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-lg">{s.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_COLORS[s.obfuscationLevel]}`}>
                    🔒 {s.obfuscationLevel.toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400">v{s.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {s.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                {s.description && <p className="text-gray-400 text-sm mt-1">{s.description}</p>}
                <p className="text-xs text-gray-600 mt-1">
                  Updated: {new Date(s.updatedAt).toLocaleDateString()} • Token: {s.accessToken.slice(0,8)}...
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {[
                  { title: s.isActive ? 'Deactivate':'Activate', onClick: () => onToggle(s.id, s.isActive),
                    color: s.isActive ? 'text-green-400 bg-green-900/30':'text-gray-500 bg-gray-800',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /> },
                  { title:'View script', onClick: () => viewScript(s.id),
                    color:'text-gray-400 bg-dark-800 hover:text-purple-400',
                    icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></> },
                  { title:'Copy install URL', onClick: () => copyUrl(s),
                    color:'text-gray-400 bg-dark-800 hover:text-green-400',
                    icon: copied === s.id
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /> },
                  { title:'Edit', onClick: () => onEdit(s),
                    color:'text-gray-400 bg-dark-800 hover:text-blue-400',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /> },
                  { title:'Delete', onClick: () => onDelete(s.id),
                    color:'text-gray-400 bg-dark-800 hover:text-red-400',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> },
                ].map((btn, i) => (
                  <button key={i} title={btn.title} onClick={btn.onClick}
                    className={`p-2 rounded-lg transition-colors ${btn.color}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {btn.icon}
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 bg-dark-800 rounded-lg p-2">
              <code className="text-xs text-purple-400 flex-1 truncate">
                {typeof window !== 'undefined' && window.location.origin}/api/scripts/{s.id}/serve
              </code>
              <button onClick={() => copyUrl(s)} className="text-xs text-gray-500 hover:text-purple-400">Copy</button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-700 rounded-2xl border border-purple-900 w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">🔒 Obfuscated Script</h3>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(viewContent); toast.success('Copied!') }}
                  className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg">Copy</button>
                <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-white p-1.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <pre className="overflow-auto p-4 text-xs text-green-400 code-editor flex-1 whitespace-pre-wrap break-all">
              {viewContent}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}