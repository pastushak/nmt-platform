'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Question, Variant } from '@/lib/types'
import MathText from '@/components/ui/MathText'

const SLOTS = Array.from({ length: 22 }, (_, i) => i + 1)

function getType(num: number) {
  if (num <= 15) return 'single'
  if (num <= 18) return 'matching'
  return 'open'
}

interface Props {
  variant: Variant
  initialQuestions: Question[]
}

export default function VariantEditor({ variant, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function getQuestion(num: number) {
    return questions.find(q => q.number === num) ?? null
  }

  async function deleteQuestion(id: string) {
    await supabase.from('questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
    router.refresh()
  }

  async function handleImport() {
    setImportError(null)
    try {
      const parsed = JSON.parse(importJson)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        const { error } = await supabase.from('questions').upsert({
          variant_id: variant.id,
          number: item.number,
          type: item.type,
          text: item.text,
          image_url: item.image_url ?? null,
          topic: item.topic ?? 'Без теми',
          options: item.options ?? null,
          correct_single: item.correct_single ?? null,
          left_items: item.left_items ?? null,
          right_items: item.right_items ?? null,
          correct_matching: item.correct_matching ?? null,
          correct_open: item.correct_open ?? null,
          accepted_answers: item.accepted_answers ?? null,
        }, { onConflict: 'variant_id,number' })
        if (error) throw new Error(error.message)
      }
      const { data } = await supabase
        .from('questions').select('*')
        .eq('variant_id', variant.id).order('number')
      setQuestions(data ?? [])
      setShowImport(false)
      setImportJson('')
      router.refresh()
    } catch (e: any) {
      setImportError(e.message || 'Невалідний JSON')
    }
  }

  return (
    <div className="space-y-6">

      {/* Панель дій */}
      <div className="flex gap-3">
        <button onClick={() => setShowImport(!showImport)} className="btn-secondary text-sm">
          📥 Імпорт JSON
        </button>
      </div>

      {/* Імпорт JSON */}
      {showImport && (
        <div className="card border-2 border-[#c8e6c9]">
          <h3 className="font-bold text-[#1a2e1a] mb-3">📥 Імпорт питань з JSON</h3>
          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            className="input font-mono text-xs resize-none"
            rows={10}
            placeholder={`[\n  {\n    "number": 1,\n    "type": "single",\n    "text": "Текст питання",\n    "topic": "Алгебра",\n    "options": {"А":"...","Б":"...","В":"...","Г":"...","Д":"..."},\n    "correct_single": "В"\n  }\n]`}
          />
          {importError && <p className="text-red-600 text-sm mt-2">{importError}</p>}
          <div className="flex gap-3 mt-3">
            <button onClick={handleImport} className="btn-primary text-sm">Імпортувати</button>
            <button onClick={() => setShowImport(false)} className="btn-secondary text-sm">Скасувати</button>
          </div>
        </div>
      )}

      {/* Блок 1 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-[#e8f5e9] text-[#2e7d32] text-xs font-bold px-3 py-1 rounded-full">Блок 1</span>
          <span className="font-bold text-[#1a2e1a]">Питання 1–15 — Вибір відповіді (max 15 балів)</span>
        </div>
        <div className="space-y-2">
          {SLOTS.filter(n => n <= 15).map(num => (
            <QuestionSlot key={num} num={num} question={getQuestion(num)}
              onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
          ))}
        </div>
      </div>

      {/* Блок 2 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-[#e3f2fd] text-[#1565c0] text-xs font-bold px-3 py-1 rounded-full">Блок 2</span>
          <span className="font-bold text-[#1a2e1a]">Питання 16–18 — Відповідності (max 9 балів)</span>
        </div>
        <div className="space-y-2">
          {SLOTS.filter(n => n >= 16 && n <= 18).map(num => (
            <QuestionSlot key={num} num={num} question={getQuestion(num)}
              onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
          ))}
        </div>
      </div>

      {/* Блок 3 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-[#fff8e1] text-[#f57f17] text-xs font-bold px-3 py-1 rounded-full">Блок 3</span>
          <span className="font-bold text-[#1a2e1a]">Питання 19–22 — Вписати відповідь (max 8 балів)</span>
        </div>
        <div className="space-y-2">
          {SLOTS.filter(n => n >= 19).map(num => (
            <QuestionSlot key={num} num={num} question={getQuestion(num)}
              onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
          ))}
        </div>
      </div>

      {/* Форма редагування */}
      {activeSlot !== null && (
        <QuestionForm
          variantId={variant.id}
          num={activeSlot}
          type={getType(activeSlot)}
          existing={getQuestion(activeSlot)}
          onSave={q => {
            setQuestions(prev => [...prev.filter(x => x.number !== q.number), q]
              .sort((a, b) => a.number - b.number))
            setActiveSlot(null)
            router.refresh()
          }}
          onCancel={() => setActiveSlot(null)}
        />
      )}

      {/* JSON довідка */}
      <div className="card bg-[#f8faf8]">
        <h3 className="font-bold text-[#1a2e1a] mb-3">📖 Формат JSON</h3>
        <div className="space-y-3 text-xs font-mono">
          <div>
            <p className="text-[#7a9a7a] mb-1">// Single (1–15):</p>
            <pre className="bg-white border border-[#e8ede8] rounded-lg p-3 overflow-x-auto">{`{"number":1,"type":"single","topic":"Алгебра","text":"Умова $$x^2$$","options":{"А":"1","Б":"2","В":"3","Г":"4","Д":"5"},"correct_single":"В"}`}</pre>
          </div>
          <div>
            <p className="text-[#7a9a7a] mb-1">// Matching (16–18):</p>
            <pre className="bg-white border border-[#e8ede8] rounded-lg p-3 overflow-x-auto">{`{"number":16,"type":"matching","topic":"Функції","text":"Встановіть відповідність","left_items":[{"id":"1","text":"y=x²"},{"id":"2","text":"y=x"},{"id":"3","text":"y=1/x"}],"right_items":[{"id":"А","text":"пряма"},{"id":"Б","text":"гіпербола"},{"id":"В","text":"парабола"},{"id":"Г","text":"коло"},{"id":"Д","text":"синусоїда"}],"correct_matching":{"1":"В","2":"А","3":"Б"}}`}</pre>
          </div>
          <div>
            <p className="text-[#7a9a7a] mb-1">// Open (19–22):</p>
            <pre className="bg-white border border-[#e8ede8] rounded-lg p-3 overflow-x-auto">{`{"number":19,"type":"open","topic":"Рівняння","text":"Розв'яжіть $$2x-6=0$$","correct_open":"3","accepted_answers":["3","3.0"]}`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionSlot({ num, question, onEdit, onDelete }: {
  num: number
  question: Question | null
  onEdit: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
      question ? 'border-[#c8e6c9] bg-[#f0faf2]' : 'border-[#e8ede8] bg-white'
    }`}>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        question ? 'bg-[#0ead69] text-white' : 'bg-[#f5f5f5] text-[#9e9e9e]'
      }`}>{num}</span>
      <div className="flex-1 min-w-0">
        {question ? (
          <div>
            <p className="text-sm text-[#1a2e1a] truncate">
              {question.text.replace(/\$\$[^$]+\$\$/g, '[формула]')}
            </p>
            <p className="text-xs text-[#7a9a7a]">{question.topic}</p>
          </div>
        ) : (
          <p className="text-sm text-[#9e9e9e] italic">Питання не додано</p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onEdit} className="text-[#0ead69] hover:text-[#0c9a5a] text-sm font-semibold">
          {question ? 'Змінити' : '+ Додати'}
        </button>
        {question && (
          <button onClick={() => onDelete(question.id)} className="text-red-400 hover:text-red-600 text-sm">
            Видалити
          </button>
        )}
      </div>
    </div>
  )
}

function QuestionForm({ variantId, num, type, existing, onSave, onCancel }: {
  variantId: string
  num: number
  type: string
  existing: Question | null
  onSave: (q: Question) => void
  onCancel: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState(existing?.text ?? '')
  const [topic, setTopic] = useState(existing?.topic ?? '')
  const [imageUrl, setImageUrl] = useState(existing?.image_url ?? '')
  const [options, setOptions] = useState((existing as any)?.options ?? { А: '', Б: '', В: '', Г: '', Д: '' })
  const [correctSingle, setCorrectSingle] = useState((existing as any)?.correct_single ?? 'А')
  const [leftItems, setLeftItems] = useState((existing as any)?.left_items ?? [
    { id: '1', text: '' }, { id: '2', text: '' }, { id: '3', text: '' }
  ])
  const [rightItems, setRightItems] = useState((existing as any)?.right_items ?? [
    { id: 'А', text: '' }, { id: 'Б', text: '' }, { id: 'В', text: '' },
    { id: 'Г', text: '' }, { id: 'Д', text: '' }
  ])
  const [correctMatching, setCorrectMatching] = useState<Record<string, string>>(
    (existing as any)?.correct_matching ?? { '1': 'А', '2': 'Б', '3': 'В' }
  )
  const [correctOpen, setCorrectOpen] = useState((existing as any)?.correct_open ?? '')
  const [acceptedAnswers, setAcceptedAnswers] = useState(
    ((existing as any)?.accepted_answers ?? []).join(', ')
  )

  async function handleSave() {
    setSaving(true)
    const payload: any = {
      variant_id: variantId, number: num, type,
      text, topic: topic || 'Без теми',
      image_url: imageUrl || null,
    }
    if (type === 'single') {
      payload.options = options
      payload.correct_single = correctSingle
    } else if (type === 'matching') {
      payload.left_items = leftItems
      payload.right_items = rightItems
      payload.correct_matching = correctMatching
    } else {
      payload.correct_open = correctOpen
      payload.accepted_answers = acceptedAnswers.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    if (existing) payload.id = existing.id

    const { data } = await supabase
      .from('questions')
      .upsert(payload, { onConflict: 'variant_id,number' })
      .select('*').single()

    if (data) onSave(data as Question)
    setSaving(false)
  }

  return (
    <div className="card border-2 border-[#0ead69]">
      <h3 className="font-bold text-[#1a2e1a] mb-5">
        ✏️ Питання {num} — {type === 'single' ? 'Вибір відповіді' : type === 'matching' ? 'Відповідності' : 'Вписати відповідь'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#445544] mb-1.5">
            Умова задачі (LaTeX через $$...$$)
          </label>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            className="input font-mono text-sm resize-none" rows={4}
            placeholder="Текст питання. Формули: $$x^2 + y^2 = r^2$$"
          />
          {text && (
            <div className="mt-2 p-3 bg-[#f8faf8] rounded-xl border border-[#e8ede8] text-sm">
              <p className="text-xs text-[#7a9a7a] mb-1">Перегляд:</p>
              <MathText text={text} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#445544] mb-1.5">Тема</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              className="input" placeholder="Алгебра, Геометрія..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#445544] mb-1.5">URL зображення</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              className="input" placeholder="https://..." />
          </div>
        </div>

        {type === 'single' && (
          <div>
            <label className="block text-sm font-medium text-[#445544] mb-2">
              Варіанти (клікни на літеру щоб позначити правильну)
            </label>
            <div className="space-y-2">
              {(['А', 'Б', 'В', 'Г', 'Д'] as const).map(opt => (
                <div key={opt} className="flex items-center gap-3">
                  <button type="button" onClick={() => setCorrectSingle(opt)}
                    className={`w-9 h-9 rounded-lg font-bold text-sm flex-shrink-0 border-2 transition-all ${
                      correctSingle === opt
                        ? 'bg-[#0ead69] text-white border-[#0ead69]'
                        : 'bg-white text-[#556655] border-[#e8ede8] hover:border-[#0ead69]'
                    }`}>{opt}</button>
                  <input type="text" value={options[opt]}
                    onChange={e => setOptions((p: any) => ({ ...p, [opt]: e.target.value }))}
                    className="input text-sm" placeholder={`Варіант ${opt}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'matching' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#445544] mb-2">Ліва колонка (1–3)</label>
                <div className="space-y-2">
                  {leftItems.map((item: any, i: number) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <span className="w-7 h-7 bg-[#0ead69] text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{item.id}</span>
                      <input type="text" value={item.text}
                        onChange={e => { const u = [...leftItems]; u[i] = { ...item, text: e.target.value }; setLeftItems(u) }}
                        className="input text-sm" placeholder={`Твердження ${item.id}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#445544] mb-2">Права колонка (А–Д)</label>
                <div className="space-y-2">
                  {rightItems.map((item: any, i: number) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <span className="w-7 h-7 bg-[#f5f5f5] text-[#556655] rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{item.id}</span>
                      <input type="text" value={item.text}
                        onChange={e => { const u = [...rightItems]; u[i] = { ...item, text: e.target.value }; setRightItems(u) }}
                        className="input text-sm" placeholder={`Варіант ${item.id}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#445544] mb-2">Правильні відповідності</label>
              <div className="flex gap-6">
                {leftItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1a2e1a]">{item.id} →</span>
                    <select value={correctMatching[item.id] ?? 'А'}
                      onChange={e => setCorrectMatching(p => ({ ...p, [item.id]: e.target.value }))}
                      className="input max-w-[72px] py-1.5">
                      {['А', 'Б', 'В', 'Г', 'Д'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === 'open' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">Правильна відповідь</label>
              <input type="text" value={correctOpen} onChange={e => setCorrectOpen(e.target.value)}
                className="input max-w-xs font-mono" placeholder="3.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#445544] mb-1.5">
                Всі допустимі форми (через кому)
              </label>
              <input type="text" value={acceptedAnswers} onChange={e => setAcceptedAnswers(e.target.value)}
                className="input max-w-sm font-mono" placeholder="3.5, 7/2, 3,5" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-[#e8ede8]">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Збереження...' : '💾 Зберегти питання'}
        </button>
        <button onClick={onCancel} className="btn-secondary">Скасувати</button>
      </div>
    </div>
  )
}
