'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Question, Variant } from '@/lib/types'
import MathText from '@/components/ui/MathText'
import ImageUpload from '@/components/ui/ImageUpload'

type Subject = 'math' | 'ukrainian'

// ---- Math config ----
const MATH_SLOTS = Array.from({ length: 22 }, (_, i) => i + 1)
function getMathType(num: number) {
  if (num <= 15) return 'single'
  if (num <= 18) return 'matching'
  return 'open'
}

// ---- Ukrainian config ----
const UKR_SLOTS = Array.from({ length: 30 }, (_, i) => i + 1)
function getUkrType(num: number) {
  if (num <= 25) return 'single'
  return 'matching'
}
// Завдання 1–10: 4 варіанти (А–Г), 11–25: 5 варіантів (А–Д)
function getUkrOptionCount(num: number): 4 | 5 {
  return num <= 10 ? 4 : 5
}

interface Props {
  variant: Variant & { subject?: Subject }
  initialQuestions: Question[]
}

export default function VariantEditor({ variant, initialQuestions }: Props) {
  const [subject, setSubject] = useState<Subject>(variant.subject ?? 'math')
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [subjectSaving, setSubjectSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const slots = subject === 'math' ? MATH_SLOTS : UKR_SLOTS
  const getType = subject === 'math' ? getMathType : getUkrType

  function getQuestion(num: number) {
    return questions.find(q => q.number === num) ?? null
  }

  async function handleSubjectChange(newSubject: Subject) {
    if (newSubject === subject) return
    setSubjectSaving(true)
    await supabase.from('variants').update({ subject: newSubject }).eq('id', variant.id)
    setSubject(newSubject)
    setSubjectSaving(false)
    router.refresh()
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

      {/* Перемикач предмету */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#445544]">Предмет:</span>
          <div className="flex rounded-xl border border-[#e8ede8] overflow-hidden">
            <button
              onClick={() => handleSubjectChange('math')}
              disabled={subjectSaving}
              className={`px-4 py-2 text-sm font-semibold transition-all ${
                subject === 'math'
                  ? 'bg-[#0ead69] text-white'
                  : 'bg-white text-[#445544] hover:bg-[#f0faf2]'
              }`}
            >
              📐 Математика
            </button>
            <button
              onClick={() => handleSubjectChange('ukrainian')}
              disabled={subjectSaving}
              className={`px-4 py-2 text-sm font-semibold transition-all border-l border-[#e8ede8] ${
                subject === 'ukrainian'
                  ? 'bg-[#1565c0] text-white'
                  : 'bg-white text-[#445544] hover:bg-[#e3f2fd]'
              }`}
            >
              🇺🇦 Українська мова
            </button>
          </div>
          {subjectSaving && <span className="text-xs text-[#7a9a7a]">Збереження...</span>}
          <div className="ml-auto text-xs text-[#7a9a7a]">
            {subject === 'math'
              ? '22 питання · max 32 бали · 60 хв'
              : '30 питань · max 45 балів · 60 хв'
            }
          </div>
        </div>
      </div>

      {/* Кнопки дій */}
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
            placeholder={subject === 'math'
              ? `[\n  {\n    "number": 1,\n    "type": "single",\n    "text": "Текст питання",\n    "topic": "Алгебра",\n    "options": {"А":"...","Б":"...","В":"...","Г":"...","Д":"..."},\n    "correct_single": "В"\n  }\n]`
              : `[\n  {\n    "number": 1,\n    "type": "single",\n    "text": "Текст питання",\n    "topic": "Орфографія",\n    "options": {"А":"...","Б":"...","В":"...","Г":"..."},\n    "correct_single": "Б"\n  }\n]`
            }
          />
          {importError && <p className="text-red-600 text-sm mt-2">{importError}</p>}
          <div className="flex gap-3 mt-3">
            <button onClick={handleImport} className="btn-primary text-sm">Імпортувати</button>
            <button onClick={() => setShowImport(false)} className="btn-secondary text-sm">Скасувати</button>
          </div>
        </div>
      )}

      {/* ===== МАТЕМАТИКА ===== */}
      {subject === 'math' && (
        <>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#e8f5e9] text-[#2e7d32] text-xs font-bold px-2.5 py-1 rounded-full">Блок 1</span>
              <h3 className="font-bold text-[#1a2e1a]">Питання 1–15 · Вибір однієї правильної (max 15 балів)</h3>
            </div>
            <div className="space-y-2">
              {MATH_SLOTS.filter(n => n <= 15).map(num => (
                <QuestionSlot key={num} num={num} question={getQuestion(num)}
                  onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#e3f2fd] text-[#1565c0] text-xs font-bold px-2.5 py-1 rounded-full">Блок 2</span>
              <h3 className="font-bold text-[#1a2e1a]">Питання 16–18 · Відповідності (max 9 балів)</h3>
            </div>
            <div className="space-y-2">
              {MATH_SLOTS.filter(n => n >= 16 && n <= 18).map(num => (
                <QuestionSlot key={num} num={num} question={getQuestion(num)}
                  onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#fff8e1] text-[#f57f17] text-xs font-bold px-2.5 py-1 rounded-full">Блок 3</span>
              <h3 className="font-bold text-[#1a2e1a]">Питання 19–22 · Вписати відповідь (max 8 балів)</h3>
            </div>
            <div className="space-y-2">
              {MATH_SLOTS.filter(n => n >= 19).map(num => (
                <QuestionSlot key={num} num={num} question={getQuestion(num)}
                  onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== УКРАЇНСЬКА МОВА ===== */}
      {subject === 'ukrainian' && (
        <>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#e3f2fd] text-[#1565c0] text-xs font-bold px-2.5 py-1 rounded-full">Блок 1</span>
              <h3 className="font-bold text-[#1a2e1a]">Питання 1–10 · 4 варіанти відповіді (А–Г)</h3>
            </div>
            <div className="space-y-2">
              {UKR_SLOTS.filter(n => n <= 10).map(num => (
                <QuestionSlot key={num} num={num} question={getQuestion(num)}
                  onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#e8f5e9] text-[#2e7d32] text-xs font-bold px-2.5 py-1 rounded-full">Блок 2</span>
              <h3 className="font-bold text-[#1a2e1a]">Питання 11–25 · 5 варіантів відповіді (А–Д)</h3>
            </div>
            <div className="space-y-2">
              {UKR_SLOTS.filter(n => n >= 11 && n <= 25).map(num => (
                <QuestionSlot key={num} num={num} question={getQuestion(num)}
                  onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#fff8e1] text-[#f57f17] text-xs font-bold px-2.5 py-1 rounded-full">Блок 3</span>
              <h3 className="font-bold text-[#1a2e1a]">Питання 26–30 · Логічні пари (до 4 балів кожне)</h3>
            </div>
            <div className="space-y-2">
              {UKR_SLOTS.filter(n => n >= 26).map(num => (
                <QuestionSlot key={num} num={num} question={getQuestion(num)}
                  onEdit={() => setActiveSlot(num)} onDelete={deleteQuestion} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Модальне вікно редагування */}
      {activeSlot !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setActiveSlot(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4"
            onClick={e => e.stopPropagation()}
          >
            <QuestionForm
              key={`${subject}-${activeSlot}`}
              variantId={variant.id}
              num={activeSlot}
              type={getType(activeSlot)}
              subject={subject}
              optionCount={subject === 'ukrainian' && activeSlot <= 25 ? getUkrOptionCount(activeSlot) : 5}
              existing={getQuestion(activeSlot)}
              onSave={q => {
                setQuestions(prev => [...prev.filter(x => x.number !== q.number), q]
                  .sort((a, b) => a.number - b.number))
                setActiveSlot(null)
                router.refresh()
              }}
              onCancel={() => setActiveSlot(null)}
            />
          </div>
        </div>
      )}

      {/* JSON довідка */}
      <div className="card bg-[#f8faf8] border-[#e8ede8]">
        <h3 className="font-bold text-[#1a2e1a] mb-3">📖 Формат JSON для імпорту</h3>
        {subject === 'math' ? (
          <div className="space-y-3 text-xs font-mono">
            <div>
              <p className="text-[#7a9a7a] mb-1">// Тип single (1–15):</p>
              <pre className="bg-white border border-[#e8ede8] rounded-xl p-3 overflow-x-auto text-[#1a2e1a]">{`{ "number": 1, "type": "single", "topic": "Алгебра",
  "text": "Знайдіть $$x^2+2x$$ при x=3",
  "options": {"А":"9","Б":"12","В":"15","Г":"18","Д":"21"},
  "correct_single": "Г" }`}</pre>
            </div>
            <div>
              <p className="text-[#7a9a7a] mb-1">// Тип matching (16–18):</p>
              <pre className="bg-white border border-[#e8ede8] rounded-xl p-3 overflow-x-auto text-[#1a2e1a]">{`{ "number": 16, "type": "matching", "topic": "Функції",
  "text": "Встановіть відповідність",
  "left_items": [{"id":"1","text":"y=x²"},{"id":"2","text":"y=x"},{"id":"3","text":"y=1/x"}],
  "right_items": [{"id":"А","text":"пряма"},{"id":"Б","text":"гіпербола"},
    {"id":"В","text":"парабола"},{"id":"Г","text":"коло"},{"id":"Д","text":"синусоїда"}],
  "correct_matching": {"1":"В","2":"А","3":"Б"} }`}</pre>
            </div>
            <div>
              <p className="text-[#7a9a7a] mb-1">// Тип open (19–22):</p>
              <pre className="bg-white border border-[#e8ede8] rounded-xl p-3 overflow-x-auto text-[#1a2e1a]">{`{ "number": 19, "type": "open", "topic": "Рівняння",
  "text": "Розвяжіть $$2x-6=0$$",
  "correct_open": "3",
  "accepted_answers": ["3", "3.0"] }`}</pre>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs font-mono">
            <div>
              <p className="text-[#7a9a7a] mb-1">// Single з 4 варіантами (1–10):</p>
              <pre className="bg-white border border-[#e8ede8] rounded-xl p-3 overflow-x-auto text-[#1a2e1a]">{`{ "number": 1, "type": "single", "topic": "Орфографія",
  "text": "Букву е треба писати у рядку",
  "options": {"А":"пр..тихо","Б":"пр..бирання","В":"пер..сторога","Г":"пр..гарно"},
  "correct_single": "В" }`}</pre>
            </div>
            <div>
              <p className="text-[#7a9a7a] mb-1">// Single з 5 варіантами (11–25):</p>
              <pre className="bg-white border border-[#e8ede8] rounded-xl p-3 overflow-x-auto text-[#1a2e1a]">{`{ "number": 11, "type": "single", "topic": "Синтаксис",
  "text": "Потребує редагування речення",
  "options": {"А":"...","Б":"...","В":"...","Г":"...","Д":"..."},
  "correct_single": "В" }`}</pre>
            </div>
            <div>
              <p className="text-[#7a9a7a] mb-1">// Логічні пари / matching (26–30):</p>
              <pre className="bg-white border border-[#e8ede8] rounded-xl p-3 overflow-x-auto text-[#1a2e1a]">{`{ "number": 26, "type": "matching", "topic": "Фразеологія",
  "text": "Доберіть до кожного речення фразеологізм",
  "left_items": [{"id":"1","text":"речення 1"},{"id":"2","text":"речення 2"},
    {"id":"3","text":"речення 3"},{"id":"4","text":"речення 4"}],
  "right_items": [{"id":"А","text":"лишатися з носом"},{"id":"Б","text":"лишатися осторонь"},
    {"id":"В","text":"лишатися на місці"},{"id":"Г","text":"лишатися позаду"},
    {"id":"Д","text":"лишатися на старих позиціях"}],
  "correct_matching": {"1":"Д","2":"Б","3":"В","4":"Г"} }`}</pre>
            </div>
          </div>
        )}
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
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      question ? 'border-[#c8e6c9] bg-[#f8fef9]' : 'border-[#e8ede8] bg-white'
    }`}>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        question ? 'bg-[#0ead69] text-white' : 'bg-[#f5f7f5] text-[#7a9a7a]'
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
          <p className="text-sm text-[#aec5ae] italic">Питання не додано</p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onEdit} className="text-xs font-semibold text-[#0ead69] hover:text-[#0c9a5a]">
          {question ? 'Змінити' : '+ Додати'}
        </button>
        {question && (
          <button onClick={() => onDelete(question.id)} className="text-xs text-red-400 hover:text-red-600">
            Видалити
          </button>
        )}
      </div>
    </div>
  )
}

function QuestionForm({ variantId, num, type, subject, optionCount, existing, onSave, onCancel }: {
  variantId: string
  num: number
  type: string
  subject: Subject
  optionCount: 4 | 5
  existing: Question | null
  onSave: (q: Question) => void
  onCancel: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState(existing?.text ?? '')
  const [topic, setTopic] = useState(existing?.topic ?? '')
  const [imageUrl, setImageUrl] = useState(existing?.image_url ?? '')

  // Single options — залежать від предмету і optionCount
  const allOptions = ['А', 'Б', 'В', 'Г', 'Д'] as const
  const activeOptions = allOptions.slice(0, optionCount)
  const defaultOptions = Object.fromEntries(activeOptions.map(o => [o, '']))
  const [options, setOptions] = useState((existing as any)?.options ?? defaultOptions)
  const [correctSingle, setCorrectSingle] = useState((existing as any)?.correct_single ?? 'А')

  // Matching — для укр. мови 4 пари (1–4 → А–Д), для мат. 3 пари
  const matchingPairCount = subject === 'ukrainian' ? 4 : 3
  const defaultLeftItems = Array.from({ length: matchingPairCount }, (_, i) => ({
    id: String(i + 1), text: ''
  }))
  const defaultRightItems = [
    { id: 'А', text: '' }, { id: 'Б', text: '' }, { id: 'В', text: '' },
    { id: 'Г', text: '' }, { id: 'Д', text: '' }
  ]
  const defaultCorrectMatching = Object.fromEntries(
    Array.from({ length: matchingPairCount }, (_, i) => [String(i + 1), allOptions[i]])
  )

  const [leftItems, setLeftItems] = useState((existing as any)?.left_items ?? defaultLeftItems)
  const [rightItems, setRightItems] = useState((existing as any)?.right_items ?? defaultRightItems)
  const [correctMatching, setCorrectMatching] = useState<Record<string, string>>(
    (existing as any)?.correct_matching ?? defaultCorrectMatching
  )

  // Open (тільки математика)
  const [correctOpen, setCorrectOpen] = useState((existing as any)?.correct_open ?? '')
  const [acceptedAnswers, setAcceptedAnswers] = useState(
    ((existing as any)?.accepted_answers ?? []).join(', ')
  )

  function getTypeLabel() {
    if (type === 'open') return 'Вписати відповідь'
    if (type === 'matching') return subject === 'ukrainian' ? 'Логічні пари' : 'Відповідності'
    return 'Вибір відповіді'
  }

  function getScoreLabel() {
    if (type === 'open') return '2 бали'
    if (type === 'matching') return subject === 'ukrainian' ? 'до 4 балів' : 'до 3 балів'
    return '1 бал'
  }

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
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold ${
            subject === 'ukrainian' ? 'bg-[#1565c0]' : 'bg-[#0ead69]'
          }`}>
            {num}
          </span>
          <div>
            <h3 className="font-bold text-[#1a2e1a]">{getTypeLabel()}</h3>
            <p className="text-xs text-[#7a9a7a]">{getScoreLabel()}</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-[#7a9a7a] hover:text-[#1a2e1a] text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f7f5]">
          ✕
        </button>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        {/* Текст питання */}
        <div>
          <label className="block text-sm font-medium text-[#445544] mb-1.5">
            {subject === 'ukrainian' ? 'Умова завдання' : 'Умова задачі (LaTeX через $$...$$)'}
          </label>
          <textarea value={text} onChange={e => setText(e.target.value)}
            className="input resize-none font-mono text-sm" rows={3}
            placeholder={subject === 'ukrainian'
              ? 'Текст завдання'
              : 'Текст питання. Формули: $$x^2 + y^2 = r^2$$'
            } />
          {text && (
            <div className="mt-2 p-3 bg-[#f8faf8] rounded-xl border border-[#e8ede8] text-sm">
              <p className="text-xs text-[#7a9a7a] mb-1">Перегляд:</p>
              <MathText text={text} />
            </div>
          )}
        </div>

        {/* Тема */}
        <div>
          <label className="block text-sm font-medium text-[#445544] mb-1.5">Тема</label>
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
            className="input"
            placeholder={subject === 'ukrainian' ? 'Орфографія, Синтаксис...' : 'Алгебра, Геометрія...'} />
        </div>

        {/* Зображення */}
        <ImageUpload
          currentUrl={imageUrl || null}
          onUpload={url => setImageUrl(url ?? '')}
        />

        {/* Single */}
        {type === 'single' && (
          <div>
            <label className="block text-sm font-medium text-[#445544] mb-2">
              Варіанти — {optionCount} відповіді (клікни на літеру щоб позначити правильну)
            </label>
            <div className="space-y-2">
              {activeOptions.map(opt => (
                <div key={opt} className="flex items-center gap-3">
                  <button type="button" onClick={() => setCorrectSingle(opt)}
                    className={`w-9 h-9 rounded-xl font-bold text-sm flex-shrink-0 border-2 transition-all ${
                      correctSingle === opt
                        ? 'bg-[#0ead69] text-white border-[#0ead69]'
                        : 'bg-white text-[#556655] border-[#e8ede8] hover:border-[#0ead69]'
                    }`}>{opt}</button>
                  <input type="text" value={options[opt] ?? ''}
                    onChange={e => setOptions((p: any) => ({ ...p, [opt]: e.target.value }))}
                    className="input text-sm" placeholder={`Варіант ${opt}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matching */}
        {type === 'matching' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#445544] mb-2">
                  Ліва колонка (1–{matchingPairCount})
                </label>
                <div className="space-y-2">
                  {leftItems.map((item: any, i: number) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <span className="w-7 h-7 bg-[#0ead69] text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {item.id}
                      </span>
                      <input type="text" value={item.text}
                        onChange={e => {
                          const u = [...leftItems]
                          u[i] = { ...item, text: e.target.value }
                          setLeftItems(u)
                        }}
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
                      <span className="w-7 h-7 bg-[#f5f7f5] text-[#556655] rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {item.id}
                      </span>
                      <input type="text" value={item.text}
                        onChange={e => {
                          const u = [...rightItems]
                          u[i] = { ...item, text: e.target.value }
                          setRightItems(u)
                        }}
                        className="input text-sm" placeholder={`Варіант ${item.id}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#445544] mb-2">
                Правильні відповідності ({matchingPairCount} пари, по 1 балу кожна)
              </label>
              <div className="flex gap-4 flex-wrap">
                {leftItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1a2e1a]">{item.id} →</span>
                    <select value={correctMatching[item.id] ?? 'А'}
                      onChange={e => setCorrectMatching(p => ({ ...p, [item.id]: e.target.value }))}
                      className="input max-w-[80px] py-1.5">
                      {['А', 'Б', 'В', 'Г', 'Д'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Open — тільки математика */}
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

      {/* Кнопки */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-[#e8ede8]">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Збереження...' : '💾 Зберегти питання'}
        </button>
        <button onClick={onCancel} className="btn-secondary">Скасувати</button>
      </div>
    </div>
  )
}