'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { seasonLabel } from '@/lib/season'

// Розпочати новий сезон: учні поточного сезону йдуть в архів (результати лишаються,
// вхід закривається). Можна відкотити — ввести попередній рік знову.
export default function SeasonSwitcher({ currentSeason }: { currentSeason: string }) {
  const next = String(Number(currentSeason) + 1)
  const [season, setSeason] = useState(next)
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const valid = /^20\d{2}$/.test(season) && season !== currentSeason

  async function apply() {
    setLoading(true)
    setMsg(null)
    const { data, error } = await supabase.rpc('set_current_season', { p_season: season })
    setLoading(false)
    setConfirm(false)
    if (error) {
      setMsg({ ok: false, text: error.message.includes('function')
        ? 'Спершу запустіть міграцію 20261026_season_setting.sql у Supabase.'
        : error.message })
      return
    }
    setMsg({ ok: true, text: `✓ Поточний сезон — ${seasonLabel(season)}. В архів перейшло учнів: ${data ?? 0}.` })
    router.refresh()
  }

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-bold text-[#1a2e1a]">🔄 Новий сезон</h2>
        <p className="text-sm text-[#7a9a7a] mt-1">
          Зараз триває {seasonLabel(currentSeason)}. Після зміни всі учні {seasonLabel(currentSeason)} перейдуть
          в архів: їхні результати залишаться, але увійти на платформу вони не зможуть.
          Нові учні реєструватимуться вже в новому сезоні. Окремого учня можна повернути
          в поточний сезон кнопкою на його картці.
        </p>
      </div>

      {!confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-[#1a2e1a]">Рік НМТ:</label>
          <input
            value={season}
            onChange={e => { setSeason(e.target.value.trim()); setMsg(null) }}
            inputMode="numeric"
            maxLength={4}
            className="input w-24"
          />
          <button onClick={() => setConfirm(true)} disabled={!valid} className="btn-primary text-sm disabled:opacity-50">
            Розпочати {seasonLabel(/^20\d{2}$/.test(season) ? season : null)}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#f9a825] bg-[#fffde7] p-3 space-y-2">
          <p className="text-sm text-[#1a2e1a]">
            Перевести всіх учнів {seasonLabel(currentSeason)} в архів і розпочати {seasonLabel(season)}?
            Скасувати можна: ввести {currentSeason} знову.
          </p>
          <div className="flex gap-2">
            <button onClick={apply} disabled={loading} className="btn-primary text-sm">
              {loading ? 'Зберігаю…' : 'Так, розпочати'}
            </button>
            <button onClick={() => setConfirm(false)} disabled={loading} className="btn-secondary text-sm">
              Скасувати
            </button>
          </div>
        </div>
      )}

      {msg && <p className={`text-sm ${msg.ok ? 'text-[#2e7d32]' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  )
}
