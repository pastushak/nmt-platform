'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AddStudentButton() {
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Створюємо юзера через Supabase Auth Admin
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: { name: name.trim(), role: 'student' }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Оновлюємо профіль — підтверджуємо одразу
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        name: name.trim(),
        email: email.trim(),
        role: 'student',
        is_verified: true,
        is_active: true,
      })
    }

    setLoading(false)
    setShow(false)
    setName('')
    setEmail('')
    setPassword('')
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setShow(true)} className="btn-primary text-sm">
        + Додати учня
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-5">Додати учня</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#445544] mb-1.5">
                  Ім'я та прізвище
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input"
                  placeholder="Іван Петренко"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#445544] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="student@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#445544] mb-1.5">Пароль</label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input font-mono"
                  placeholder="Мінімум 6 символів"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <p className="text-xs text-[#7a9a7a] mt-3">
              Учень буде одразу підтверджений і матиме доступ до тестів.
            </p>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShow(false)} className="btn-secondary flex-1">
                Скасувати
              </button>
              <button
                onClick={handleAdd}
                disabled={loading || !name || !email || !password}
                className="btn-primary flex-1"
              >
                {loading ? 'Створення...' : 'Додати'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
