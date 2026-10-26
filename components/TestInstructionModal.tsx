'use client'

import { Layout, FULL_MATH_LAYOUT, blockRanges, rangeLabel, maxScore, totalQuestions } from '@/lib/variant-layout'

interface Props {
  variantTitle: string
  timeLimit: number
  isTopic?: boolean
  layout?: Layout
  onStart: () => void
}

export default function TestInstructionModal({ variantTitle, timeLimit, isTopic = false, layout = FULL_MATH_LAYOUT, onStart }: Props) {
  const r = blockRanges(layout)
  const rules = [
    r.single && { icon: '1️⃣', text: `Питання ${rangeLabel(r.single)}: оберіть одну правильну відповідь з п'яти (А/Б/В/Г/Д) — 1 бал кожне` },
    r.matching && { icon: '2️⃣', text: `Питання ${rangeLabel(r.matching)}: встановіть відповідність між лівою і правою колонкою — до 3 балів` },
    r.open && { icon: '3️⃣', text: `Питання ${rangeLabel(r.open)}: впишіть числову відповідь — 2 бали кожне` },
    { icon: '⏱', text: `Таймер ${timeLimit} хв — намагайтесь вкластись у час` },
    isTopic && { icon: '🎯', text: 'Тематичний тест: результат показується у відсотках, без переведення у шкалу НМТ' },
    { icon: '💾', text: 'Відповіді зберігаються автоматично після кожного вибору' },
    { icon: '🚫', text: 'Не виходьте з вкладки тесту (інші вкладки, програми, згортання браузера). Перші 2 рази — попередження, на 3-й тест анулюється і зараховуються лише вже введені відповіді. Довідкові матеріали відкриваються кнопкою «📚 Матеріали» прямо в тесті' },
    { icon: '✅', text: 'Натисніть "Завершити спробу" коли будете готові здати тест' },
  ].filter(Boolean) as { icon: string; text: string }[]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">

        {/* Заголовок — фіксований */}
        <div className="p-8 pb-4 flex-shrink-0">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#e8f5e9] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 3L4 9v8c0 7.7 5.3 13 12 15 6.7-2 12-7.3 12-15V9L16 3z" fill="#0ead69" fillOpacity="0.9"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1a2e1a]">{variantTitle}</h2>
            <p className="text-sm text-[#7a9a7a] mt-1">Ознайомтесь з інструкцією перед початком</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-[#f8faf8] rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#0ead69]">{timeLimit}</div>
              <div className="text-xs text-[#7a9a7a] mt-0.5">хвилин</div>
            </div>
            <div className="bg-[#f8faf8] rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#1565c0]">{totalQuestions(layout)}</div>
              <div className="text-xs text-[#7a9a7a] mt-0.5">питання</div>
            </div>
            <div className="bg-[#f8faf8] rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#7b1fa2]">{maxScore(layout)}</div>
              <div className="text-xs text-[#7a9a7a] mt-0.5">макс. балів</div>
            </div>
          </div>
        </div>

        {/* Пам'ятка — скролиться */}
        <div className="overflow-y-auto flex-1 px-8">
          <div className="bg-[#f8faf8] rounded-xl p-4 mb-4 space-y-2.5">
            <h3 className="text-sm font-bold text-[#1a2e1a] mb-3">📋 Пам'ятка</h3>
            {rules.map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">{icon}</span>
                <p className="text-sm text-[#445544] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка — фіксована внизу */}
        <div className="p-8 pt-4 flex-shrink-0">
          <button onClick={onStart} className="btn-primary w-full text-base py-3">
            ▶ Розпочати тест
          </button>
          <p className="text-center text-xs text-[#aec5ae] mt-3">
            Таймер запуститься після натискання кнопки
          </p>
        </div>

      </div>
    </div>
  )
}