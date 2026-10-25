'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { DEFAULT_TOPIC_LAYOUT, Layout, MATH_TOPICS, VariantKind, maxScore, totalQuestions } from '@/lib/variant-layout'

export default function NewVariantPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState(60)
  const [kind, setKind] = useState<VariantKind>('full')
  const [topic, setTopic] = useState('')
  const [layout, setLayout] = useState<Layout>(DEFAULT_TOPIC_LAYOUT)

  function switchKind(k: VariantKind) {
    setKind(k)
    setTimeLimit(k === 'topic' ? 30 : 60)
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (kind === 'topic' && (!topic.trim() || totalQuestions(layout) === 0)) {
      setError('Вкажіть тему та хоча б одне питання')
      return
    }
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
        kind,
        ...(kind === 'topic' ? { subject: 'math', topic: topic.trim(), layout } : {}),
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
          <h1 className="font-bold text-[#1a2e1a]">{kind === 'topic' ? 'Новий тематичний тест' : 'Новий варіант'}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="card">
          <form onSubmit={handleCreate} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">Тип</label>
              <div className="flex rounded-xl border border-[#e8ede8] overflow-hidden w-fit">
                <button type="button" onClick={() => switchKind('full')}
                  className={`px-4 py-2 text-sm font-semibold transition-all ${
                    kind === 'full' ? 'bg-[#0ead69] text-white' : 'bg-white text-[#445544] hover:bg-[#f0faf2]'
                  }`}>
                  📝 Повний варіант НМТ
                </button>
                <button type="button" onClick={() => switchKind('topic')}
                  className={`px-4 py-2 text-sm font-semibold transition-all border-l border-[#e8ede8] ${
                    kind === 'topic' ? 'bg-[#f57f17] text-white' : 'bg-white text-[#445544] hover:bg-[#fff8e1]'
                  }`}>
                  🎯 Тематичний тест
                </button>
              </div>
              {kind === 'topic' && (
                <p className="text-xs text-[#7a9a7a] mt-1.5">Тільки математика · результат у відсотках, без шкали 100–200</p>
              )}
            </div>

            {kind === 'topic' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#445544] mb-1.5">Тема *</label>
                  <input
                    type="text"
                    list="math-topics"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="input"
                    placeholder="Оберіть зі списку або впишіть свою"
                    required
                  />
                  <datalist id="math-topics">
                    {MATH_TOPICS.map(t => <option key={t} value={t} />)}
                  </datalist>
                  <p className="text-xs text-[#aec5ae] mt-1">Тести з однаковою темою групуються разом у учнів</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#445544] mb-1.5">Кількість питань</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ['single', 'Вибір відповіді', '1 б.'],
                      ['matching', 'Відповідності', '3 б.'],
                      ['open', 'Вписати відповідь', '2 б.'],
                    ] as const).map(([key, label, pts]) => (
                      <div key={key}>
                        <p className="text-xs text-[#7a9a7a] mb-1">{label} · {pts}</p>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={layout[key]}
                          onChange={e => setLayout(l => ({ ...l, [key]: Math.max(0, Math.min(30, Number(e.target.value) || 0)) }))}
                          className="input"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#7a9a7a] mt-1.5">
                    Разом: {totalQuestions(layout)} питань · max {maxScore(layout)} балів. Можна змінити пізніше в редакторі.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Назва варіанту *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input"
                placeholder={kind === 'topic' ? 'Наприклад: Похідна — базовий рівень' : 'Наприклад: Варіант 1 — Алгебра і геометрія'}
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
                  {kind === 'topic' ? 'Для короткого тесту зазвичай 15–30 хвилин' : 'Стандарт НМТ з математики: 60 хвилин'}
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
