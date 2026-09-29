'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep]         = useState<'check'|'setup'|'login'>('check')
  const [totpCode, setTotpCode] = useState('')
  const [setupKey, setSetupKey] = useState('')
  const [qrCode, setQrCode]     = useState('')
  const [secret, setSecret]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => { checkSetup() }, [])

  async function checkSetup() {
    try {
      const res  = await fetch('/api/auth/setup')
      const data = await res.json()
      setStep(data.isSetup ? 'login' : 'setup')
    } catch { setStep('login') }
    finally  { setChecking(false) }
  }

  async function requestQR() {
    if (!setupKey) { toast.error('Enter setup key first'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/setup', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ setupKey, requestQR: true }),
      })
      const data = await res.json()
      if (data.qrCode) {
        setQrCode(data.qrCode)
        setSecret(data.secret)
        toast.success('Scan QR with Google Authenticator!')
      } else {
        toast.error(data.error || 'Invalid setup key')
      }
    } catch { toast.error('Connection error') }
    finally  { setLoading(false) }
  }

  async function handleSetup() {
    if (totpCode.length !== 6) { toast.error('Enter 6-digit code'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/setup', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ setupKey, secret, totpCode }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Setup complete!')
        router.push('/dashboard')
      } else {
        toast.error(data.error || 'Invalid code')
        setTotpCode('')
      }
    } catch { toast.error('Connection error') }
    finally  { setLoading(false) }
  }

  async function handleLogin() {
    if (totpCode.length !== 6) { toast.error('Enter 6-digit code'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/verify', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ totpCode }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Access granted!')
        router.push('/dashboard')
      } else {
        toast.error('Invalid code')
        setTotpCode('')
      }
    } catch { toast.error('Connection error') }
    finally  { setLoading(false) }
  }

  if (checking) return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
    </div>
  )

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 mb-4 glow-purple">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">TamperMonkey Admin</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {step === 'setup' ? 'First time setup' : 'Enter your authenticator code'}
          </p>
        </div>

        <div className="bg-dark-700 rounded-2xl p-6 border border-purple-900 glow-purple">
          {step === 'setup' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Setup Key</label>
                <input
                  type="password"
                  value={setupKey}
                  onChange={e => setSetupKey(e.target.value)}
                  placeholder="Enter ADMIN_SETUP_KEY"
                  className="w-full bg-dark-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {!qrCode ? (
                <button onClick={requestQR} disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </button>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-300 mb-3">Scan with Google Authenticator</p>
                    <div className="inline-block p-3 bg-white rounded-xl">
                      <img src={qrCode} alt="QR" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Secret: <code className="text-purple-400">{secret}</code>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Verify Code</label>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-dark-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button onClick={handleSetup} disabled={loading || totpCode.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Complete Setup'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="w-full bg-dark-800 border border-gray-700 rounded-lg px-4 py-4 text-white text-center text-3xl tracking-widest font-mono focus:outline-none focus:border-purple-500"
              />
              <button onClick={handleLogin} disabled={loading || totpCode.length !== 6}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 glow-purple">
                {loading ? 'Verifying...' : '🔓 Enter Admin Panel'}
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-gray-600 text-xs mt-4">Protected by TOTP • tamperapp.vercel.app</p>
      </div>
    </div>
  )
}