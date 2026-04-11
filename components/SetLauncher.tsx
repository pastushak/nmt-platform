'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface PastAttempt {
  id: string
  math_nmt_score: number | null
  ukrainian_nmt_score: number | null
  finished_at: string
}

interface Props {
  canStart: boolean
  isVerified: boolean
  mathCount: number
  ukrainianCount: number
  pastAttempts: PastAttempt[]
  inProgressId: string | null
  userId: string
}

export default function SetLauncher({
  canStart,
  isVerified,
  mathCount,
  ukrainianCount,
  pastAttempts,
  inProgressId,
  userId,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Вибираємо випадкові варіанти
    const { data: mathVariants } = await supabase
      .from('variants')
      .select('id')
      .eq('subject', 'math')
      .eq('is_published', true)

    const { data: ukrainianVariants } = await supabase
      .from('variants')
      .select('id')
      .eq('subject', 'ukrainian')
      .eq('is_published', true)

    if (!mathVariants?.length || !ukrainianVariants?.length) {
      setError('Немає доступних варіантів')
      setLoading(false)
      return
    }

    const mathVariant = mathVariants[Math.floor(Math.random() * mathVariants.length)]
    const ukrainianVariant = ukrainianVariants[Math.floor(Math.random() * ukrainianVariants.length)]

    const { data, error: dbError } = await supabase
      .from('set_attempts')
      .insert({
        student_id: userId,
        math_variant_id: mathVariant.id,
        ukrainian_variant_id: ukrainianVariant.id,
        started_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (dbError || !data) {
      setError('Помилка створення сету. Спробуй ще раз.')
      setLoading(false)
      return
    }

    window.location.href = `/set/${data.id}`
  }

  return (
    <div className="space-y-6">

      {/* Заголовок */}
      <div>
        <div className="inline-flex items-center gap-2 bg-white border border-[#c8e6c9] rounded-full px-3 py-1 text-xs font-semibold text-[#2e7d32] mb-3">
          <span className="w-2 h-2 bg-[#0ead69] rounded-full"></span>
          НМТ 2026 · Сет-режим
        </div>
        <h1 className="text-2xl font-bold text-[#1a2e1a] tracking-tight mb-1">
          Повний сет НМТ
        </h1>
        <p className="text-sm text-[#6b8f6b]">
          Математика + Українська мова — як на реальному іспиті
        </p>
      </div>

      {/* Інфо картка */}
      <div className="card space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#f8faf8] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#0ead69]">120</div>
            <div className="text-xs text-[#7a9a7a] mt-0.5">хвилин</div>
          </div>
          <div className="bg-[#f8faf8] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#1565c0]">52</div>
            <div className="text-xs text-[#7a9a7a] mt-0.5">питання</div>
          </div>
          <div className="bg-[#f8faf8] rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#7b1fa2]">2</div>
            <div className="text-xs text-[#7a9a7a] mt-0.5">предмети</div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-[#445544]">
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">📐</span>
            <span><strong>Математика:</strong> 22 питання (15 вибір + 3 відповідності + 4 вписати) · до 32 балів</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">🇺🇦</span>
            <span><strong>Укр. мова:</strong> 30 питань (25 вибір + 5 логічних пар) · до 45 балів</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">🔀</span>
            <span>Варіанти вибираються <strong>випадково</strong> кожен раз</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">⏱</span>
            <span>Один таймер на обидва предмети, вільне переключення між ними</span>
          </div>
        </div>

        {/* Доступність варіантів */}
        <div className="flex gap-3 pt-1">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            mathCount > 0 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#fff8e1] text-[#f57f17]'
          }`}>
            {mathCount > 0 ? '✓' : '⚠'} Математика: {mathCount} варіантів
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            ukrainianCount > 0 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#fff8e1] text-[#f57f17]'
          }`}>
            {ukrainianCount > 0 ? '✓' : '⚠'} Укр. мова: {ukrainianCount} варіантів
          </div>
        </div>
      </div>

      {/* Незавершена спроба */}
      {inProgressId && (
        <div className="bg-[#fff8e1] border border-[#ffe082] rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#f57f17]">⏸ Є незавершений сет</p>
            <p className="text-xs text-[#7a9a7a] mt-0.5">Продовж з того місця де зупинився</p>
          </div>
          <Link href={`/set/${inProgressId}`} className="btn-primary text-sm py-2 px-4 flex-shrink-0">
            Продовжити →
          </Link>
        </div>
      )}

      {/* Кнопка старту */}
      {!inProgressId && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {!isVerified ? (
            <div className="card text-center py-8">
              <p className="text-3xl mb-3">⏳</p>
              <p className="font-semibold text-[#1a2e1a]">Акаунт не підтверджено</p>
              <p className="text-sm text-[#7a9a7a] mt-1">Зверніться до викладача для підтвердження</p>
            </div>
          ) : !canStart ? (
            <div className="card text-center py-8">
              <p className="text-3xl mb-3">📭</p>
              <p className="font-semibold text-[#1a2e1a]">Немає доступних варіантів</p>
              <p className="text-sm text-[#7a9a7a] mt-1">Викладач ще не додав варіанти для обох предметів</p>
            </div>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="btn-primary w-full text-base py-4"
            >
              {loading ? '⏳ Підготовка сету...' : '▶ Почати сет НМТ'}
            </button>
          )}
        </>
      )}

      {/* Попередні спроби */}
      {pastAttempts.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-[#1a2e1a] mb-3">📋 Попередні сети</h3>
          <div className="space-y-2">
            {pastAttempts.map(a => (
              <Link
                key={a.id}
                href={`/set-results/${a.id}`}
                className="flex items-center justify-between p-3 bg-[#f8faf8] rounded-xl hover:bg-[#f0faf2] transition-colors"
              >
                <span className="text-sm text-[#7a9a7a]">
                  {new Date(a.finished_at).toLocaleDateString('uk-UA', {
                    day: 'numeric', month: 'long'
                  })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#7a9a7a]">
                    📐 <span className="font-bold text-[#1a2e1a]">{a.math_nmt_score ?? '—'}</span>
                  </span>
                  <span className="text-xs text-[#7a9a7a]">
                    🇺🇦 <span className="font-bold text-[#1a2e1a]">{a.ukrainian_nmt_score ?? '—'}</span>
                  </span>
                  <span className="text-xs text-[#0ead69] font-semibold">Результати →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}