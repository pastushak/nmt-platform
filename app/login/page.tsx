'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Невірний email або пароль')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    router.push(profile?.role === 'teacher' ? '/admin' : '/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0ead69] rounded-2xl mb-4 shadow-lg shadow-[#0ead69]/20">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L4 7.5v7c0 5.8 4 9.8 10 11.5 6-1.7 10-5.7 10-11.5v-7L14 2z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a2e1a] tracking-tight">НМТ Математика</h1>
          <p className="text-[#7a9a7a] text-sm mt-1">Платформа підготовки 2026</p>
        </div>

        {/* Картка форми */}
        <div className="card shadow-sm">
          <h2 className="text-lg font-bold text-[#1a2e1a] mb-6">Вхід до системи</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Вхід...
                </>
              ) : 'Увійти'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#7a9a7a] text-xs mt-6">
          Для отримання доступу зверніться до викладача
        </p>
      </div>
    </div>
  )
}