'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { seasonLabel } from '@/lib/season'

// Повернути учня з архіву в поточний сезон (наприклад, продовжує підготовку ще рік)
export default function MoveToCurrentSeason({ studentId, studentSeason, currentSeason }: {
  studentId: string
  studentSeason: string | null
  currentSeason: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function move() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('users').update({ season: currentSeason }).eq('id', studentId)
    setLoading(false)
    if (error) { setError(error.message); return }
    router.refresh()
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#e8ede8] flex flex-wrap items-center gap-3">
      <p className="text-sm text-[#7a9a7a]">
        Учень в архіві {seasonLabel(studentSeason)} і не може увійти. Його результати збережуться в будь-якому разі.
      </p>
      <button onClick={move} disabled={loading} className="btn-primary text-sm">
        {loading ? 'Переношу…' : `Перенести в ${seasonLabel(currentSeason)}`}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
