'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function NewVariantPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('variants')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        time_limit: timeLimit,
        is_published: false,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      setError('Помилка при створенні варіанту')
      setLoading(false)
      return
    }

    router.push('/admin/variants/' + data.id)
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/admin/variants" className="text-sm text-[#7a9a7a] hover:text-[#1a2e1a]">
            ← Варіанти
          </Link>
          <span className="text-[#c8e6c9]">|</span>
          <h1 className="font-bold text-[#1a2e1a]">Новий варіант</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="card">
          <form onSubmit={handleCreate} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Назва варіанту *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input"
                placeholder="Наприклад: Варіант 1 — Алгебра і геометрія"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Опис (необов'язково)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Короткий опис тематики варіанту"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Час виконання (хвилини)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={timeLimit}
                  onChange={e => setTimeLimit(Number(e.target.value))}
                  className="input max-w-[120px]"
                  min={10}
                  max={300}
                />
                <span className="text-sm text-[#7a9a7a]">
                  Стандарт НМТ з математики: 60 хвилин
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Створення...' : 'Створити та додати питання →'}
              </button>
              <Link href="/admin/variants" className="btn-secondary">
                Скасувати
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
