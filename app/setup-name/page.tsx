'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SetupNamePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().split(' ').length < 2) {
      setError("Введіть ім'я та прізвище (два слова)")
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ name: name.trim() })
      .eq('id', user.id)

    if (updateError) {
      setError('Помилка збереження. Спробуйте ще раз.')
      setLoading(false)
      return
    }

    router.push('/home')
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
          <p className="text-[#7a9a7a] text-sm mt-1">Майже готово!</p>
        </div>

        {/* Картка */}
        <div className="card shadow-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">👋</div>
            <h2 className="text-lg font-bold text-[#1a2e1a]">Як вас звати?</h2>
            <p className="text-sm text-[#7a9a7a] mt-1">
              Введіть своє ім'я та прізвище — це побачить ваш викладач
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Ім'я та прізвище
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input text-center text-lg"
                placeholder="Іван Петренко"
                required
                autoFocus
              />
              <p className="text-xs text-[#aec5ae] mt-1.5 text-center">
                Наприклад: Іван Петренко
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary w-full"
            >
              {loading ? 'Збереження...' : 'Продовжити →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#7a9a7a] text-xs mt-6">
          Ці дані можна змінити пізніше через викладача
        </p>
      </div>
    </div>
  )
}