import { MAX_VIOLATIONS } from '@/lib/use-tab-guard'

/** Позначка про виходи з вкладки під час тесту (на сторінці результатів) */
export default function ViolationBanner({ violations, annulled }: { violations?: number | null; annulled?: boolean | null }) {
  if (annulled) {
    return (
      <div className="rounded-2xl bg-[#c8163a] text-white p-4 text-center">
        <p className="font-black text-lg">❌ Тест анульовано</p>
        <p className="text-sm text-white/85 mt-1">
          {MAX_VIOLATIONS} виходи з вкладки під час тесту. Зараховано відповіді, введені до анулювання.
        </p>
      </div>
    )
  }
  if (violations && violations > 0) {
    return (
      <div className="rounded-2xl bg-[#fff8e1] border border-[#ffe082] text-[#8d6e00] p-3 text-center text-sm">
        ⚠️ Виходів з вкладки під час тесту: <strong>{violations}</strong> з {MAX_VIOLATIONS - 1} допустимих
      </div>
    )
  }
  return null
}

/** Коротка позначка для списків спроб у кабінеті вчителя */
export function ViolationTag({ violations, annulled }: { violations?: number | null; annulled?: boolean | null }) {
  if (annulled) return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#c8163a] text-white align-middle">анульовано</span>
  if (violations && violations > 0)
    return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fff3cd] text-[#8d6e00] align-middle" title="Виходи з вкладки під час тесту">⚠ {violations}</span>
  return null
}
