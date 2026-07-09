'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic-link'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
    router.refresh()
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage('가입 확인 이메일을 보냈습니다. 메일함을 확인해 주세요.')
  }

  const handleMagicLink = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage('로그인 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-lg p-6 space-y-5">
        <div className="text-center">
          <h1 className="font-semibold text-gray-900">선엔지니어링 입찰 공고 분석기</h1>
          <p className="text-sm text-gray-500 mt-1">로그인해서 계속하세요</p>
        </div>

        <div className="flex rounded-md border overflow-hidden text-sm">
          <button
            type="button"
            className={`flex-1 py-1.5 transition-colors ${mode === 'password' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => { setMode('password'); setError(null); setMessage(null) }}
          >
            이메일 + 비밀번호
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 transition-colors ${mode === 'magic-link' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => { setMode('magic-link'); setError(null); setMessage(null) }}
          >
            매직 링크
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={e => {
            e.preventDefault()
            if (mode === 'password') handleSignIn()
            else handleMagicLink()
          }}
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {mode === 'password' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="비밀번호 (6자 이상)"
                minLength={6}
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
          {message && <p className="text-xs text-green-600">{message}</p>}

          {mode === 'password' ? (
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? '처리 중...' : '로그인'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSignUp}
                className="flex-1 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
              >
                {loading ? '처리 중...' : '회원가입'}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? '전송 중...' : '로그인 링크 받기'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
