'use client'

import { useEffect } from 'react'
import { MAX_VIOLATIONS } from '@/lib/use-tab-guard'
import { MATERIALS } from '@/lib/materials-data'
import MaterialsAccordion from '@/components/MaterialsAccordion'

/** Попередження після виходу з вкладки (1-ше, 2-ге) */
export function ViolationWarning({ count, onClose }: { count: number; onClose: () => void }) {
  const left = MAX_VIOLATIONS - count
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center border-4 border-[#f9a825]">
        <div className="text-5xl mb-3">⚠️</div>
        <h3 className="text-lg font-bold text-[#1a2e1a]">
          Попередження {count} з {MAX_VIOLATIONS - 1}
        </h3>
        <p className="text-sm text-[#445544] mt-2">
          Ви вийшли з вкладки тесту. Під час тесту не можна перемикатися на інші вкладки чи програми.
        </p>
        <p className="text-sm font-bold text-red-600 mt-3">
          {left === 1
            ? 'Наступний вихід — і тест буде анульовано!'
            : `Ще ${left} виходи — і тест буде анульовано.`}
        </p>
        <button onClick={onClose} className="btn-primary w-full mt-5">
          Зрозуміло, продовжити тест
        </button>
      </div>
    </div>
  )
}

/** Тест анульовано — на весь екран */
export function AnnulledScreen({ score, unit = 'балів', onContinue }: {
  score: string | number | null
  unit?: string
  onContinue: () => void
}) {
  return (
    <div className="fixed inset-0 bg-[#c8163a] z-[70] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">❌ ТЕСТ АНУЛЬОВАНО ❌</h1>
      <p className="text-lg sm:text-xl font-bold text-white mt-5">Ліміт порушень вичерпано</p>
      <p className="text-sm text-white/80 mt-2 max-w-md">
        Ви {MAX_VIOLATIONS} рази вийшли з вкладки тесту. Зараховано відповіді, введені до анулювання.
      </p>
      {score !== null && (
        <p className="text-xl sm:text-2xl font-bold text-[#ffd1dc] mt-6">Ваш результат: {score} {unit}</p>
      )}
      <button
        onClick={onContinue}
        className="mt-8 bg-white text-[#c8163a] font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-[#ffe4ea] transition-colors"
      >
        Переглянути результати
      </button>
    </div>
  )
}

/** Довідкові матеріали поверх тесту (нова вкладка була б порушенням) */
export function MaterialsOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center p-2 sm:p-6" onClick={onClose}>
      <div className="bg-[#f5f7f5] rounded-2xl w-full max-w-4xl flex flex-col max-h-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e8ede8] bg-white rounded-t-2xl">
          <h2 className="font-bold text-[#1a2e1a]">📚 Довідкові матеріали</h2>
          <button onClick={onClose} className="btn-secondary text-sm">✕ Закрити</button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">
          <MaterialsAccordion materials={MATERIALS} />
        </div>
      </div>
    </div>
  )
}
