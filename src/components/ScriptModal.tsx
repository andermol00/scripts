'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Script {
  id: string; name: string; description: string
  version: number; isActive: boolean; obfuscationLevel: string
  accessToken: string; createdAt: string; updatedAt: string
  metadata: Record<string, any>
}

const EXAMPLE = `// ==UserScript==
// @name         My Script
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Does something cool
// @author       You
// @match        https://example.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('Script loaded!');
})();`

const LEVELS = {
  low    : { label:'Low',     color:'border-green-500 bg-green-900/30',   desc:'Basic renaming' },
  medium : { label:'Medium',  color:'border-yellow-500 bg-yellow-900/30', desc:'String encoding + control flow' },
  high   : { label:'High',    color:'border-orange-500 bg-orange-900/30', desc:'RC4 + debug protection' },
  maximum: { label:'Maximum', color:'border-red-500 bg-red-900/30',       desc:'All protections + self-defending' },
}

export default function ScriptModal({ script, onClose, onSave }: { script: Script|null; onClose: ()=>void; onSave: ()=>void }) {
  const [name,     setName]     = useState('')
  const [desc,     setDesc]     = useState('')
  const [raw,      setRaw]      = useState(EXAMPLE)
  const [level,    setLevel]    = useState('high')
  const [loading,  setLoading]  = useState(false)
  const [loadRaw,  setLoadRaw]  = useState(false)

  useEffect(() => {
    if (script) {
      setName(script.name)
      setDesc(script.description || '')
      setLevel(script.obfuscationLevel)
      setLoadRaw(true)
      fetch(`/api/scripts/${script.id}?view=raw`)
        .then(r => r.json())
        .then(d => setRaw(d.rawScript || ''))
        .catch(() => toast.error('Failed to load script'))
        .finally(() => setLoadRaw(false))
    } else {
      setRaw(EXAMPLE)
    }
  }, [script])

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!raw.trim())  { toast.error('Script is required'); return }
    setLoading(true)
    try {
      const url    = script ? `/api/scripts/${script.id}` : '/api/scripts'
      const method = script ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ name: name.trim(), description: desc.trim(), rawScript: raw, obfuscationLevel: level }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(script ? 'Script updated & re-obfuscated!' : 'Script created & obfuscated!')
        onSave()
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch { toast.error('Connection error') }
    finally  { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-700 rounded-2xl border border-purple-900 w-full max-w-4xl max-h-[90vh] flex flex-col glow-purple">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-bold text-xl">{script ? '✏️ Edit Script' : '➕ New Script'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label:'Script Name *', value:name, set:setName, placeholder:'My Awesome Script' },
              { label:'Description',   value:desc, set:setDesc, placeholder:'What does it do?' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-gray-300 mb-2">{f.label}</label>
                <input type="text" value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-dark-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">🔒 Obfuscation Level</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(LEVELS).map(([key, cfg]) => (
                <button key={key} onClick={() => setLevel(key)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${level === key ? cfg.color : 'border-gray-700 bg-dark-800 hover:border-gray-600'}`}>
                  <div className="font-semibold text-white text-sm">{cfg.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{cfg.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">📝 Raw Script (with TamperMonkey header)</label>
              <button onClick={() => setRaw(EXAMPLE)} className="text-xs text-gray-500 hover:text-purple-400">Load Example</button>
            </div>
            {loadRaw ? (
              <div className="flex items-center justify-center h-48 bg-dark-800 rounded-xl border border-gray-700">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
              </div>
            ) : (
              <textarea value={raw} onChange={e => setRaw(e.target.value)}
                className="w-full h-72 bg-dark-800 border border-gray-700 rounded-xl p-4 text-green-400 placeholder-gray-700 focus:outline-none focus:border-purple-500 code-editor resize-none" />
            )}
            <p className="text-xs text-gray-600 mt-1">
              ℹ️ Header is preserved as-is. Only the body is obfuscated. Auto-update system is added automatically.
            </p>
          </div>

          <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">🤖 What gets added automatically</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✅ <strong>@updateURL</strong> & <strong>@downloadURL</strong> → TamperMonkey auto-updates every 24h</li>
              <li>✅ <strong>Kill Switch</strong> → Disable the script remotely from this panel</li>
              <li>✅ <strong>Version check</strong> → Notifies user when update is available</li>
              <li>✅ <strong>Activity ping</strong> → See when the script is being used</li>
              <li>✅ <strong>Version auto-increment</strong> → Each edit bumps the version number</li>
            </ul>
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            {script ? `v${script.version} → v${script.version + 1}` : 'New script → v1'}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 glow-purple">
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />Obfuscating...</>
              ) : (
                <>{script ? '🔄 Update & Re-obfuscate' : '🔒 Create & Obfuscate'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}